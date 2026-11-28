import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
import { DEFAULT_ACCENT } from '../lib/theme'
import { useAuth } from './AuthProvider'
import { clearCachedSummary, readCachedSummary, writeCachedSummary } from '../lib/dataCache'
import { toast } from '../lib/toast'

// Same shape as the PWA's initial state, so every module can read its arrays before the first load.
const EMPTY = {
  accounts: [], categories: [], transactions: [], budgets: [], portfolios: [], holdings: [], sips: [], other_investments: [], kite_orders: [],
  loans: [], loan_payments: [], bucket_list: [], lend_borrow: [], lend_repayments: [], lend_borrow_additions: [], credit_cards: [],
  credit_card_transactions: [], scholarships: [], scholarship_payments: [], money_rules: [], recurring_transactions: [], money_profiles: [],
  money_profile_entries: [], recurring_money_profile_entries: [], budget_months: [], budget_month_categories: [], vault_items: [],
  chit_funds: [], chit_fund_payments: [], scheduled_transactions: [], profile: null,
}
const DataContext = createContext(null)

// One /finance/summary load hydrates everything, the same model as the web app: mutations call
// their endpoint, then refresh().
export function DataProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // True once a load has succeeded for this user — before that, an error means there's nothing to
  // show at all (full-screen retry); after it, the last good data stays up with a banner.
  const [loaded, setLoaded] = useState(false)

  // When the data on screen came from the on-phone cache (offline, or the first moments of a
  // launch) rather than the server — the Shell shows a small "offline" bar while it's stale.
  const [fromCache, setFromCache] = useState(false)
  const userRef = useRef(userId)
  userRef.current = userId

  // Profile fields changed on the phone whose save hasn't been confirmed yet. A refresh that was
  // already on its way when they changed carries the old values, and would flip the screen back
  // for a moment (tapping through themes made it flick between them) — held fields win until the
  // server has them.
  const profileHold = useRef({})
  // Only the newest refresh may land: an older one that finishes last would show older data.
  const refreshSeq = useRef(0)

  const refresh = useCallback(async () => {
    const forUser = userRef.current
    const seq = ++refreshSeq.current
    try {
      const summary = await api('/finance/summary')
      if (userRef.current !== forUser || seq !== refreshSeq.current) return
      const held = profileHold.current
      const profile = summary.profile && Object.keys(held).length ? { ...summary.profile, ...held } : summary.profile
      setData({ ...EMPTY, ...summary, profile })
      setError(null)
      setLoaded(true)
      setFromCache(false)
      if (forUser) writeCachedSummary(forUser, summary)
    } catch (e) {
      if (seq === refreshSeq.current) setError(e.message || 'Could not load your data')
    } finally {
      if (seq === refreshSeq.current) setLoading(false)
    }
  }, [])

  // Settings taps (theme, accent, modules, toggles…) show at once; the save to the server waits a
  // moment so tapping through several options sends one save and one refresh, not one per tap.
  // Lives here rather than in the Shell because a theme change remounts the whole screen tree
  // below the theme provider, and a pending save must survive that.
  const pendingProfile = useRef({})
  const profileTimer = useRef(null)
  const profileWaiters = useRef([])
  const saveProfile = useCallback((body) => {
    setData((d) => ({ ...d, profile: d.profile ? { ...d.profile, ...body } : d.profile }))
    profileHold.current = { ...profileHold.current, ...body }
    pendingProfile.current = { ...pendingProfile.current, ...body }
    clearTimeout(profileTimer.current)
    return new Promise((resolve) => {
      profileWaiters.current.push(resolve)
      profileTimer.current = setTimeout(async () => {
        const sent = pendingProfile.current
        const waiters = profileWaiters.current
        pendingProfile.current = {}
        profileWaiters.current = []
        let ok = true
        try { await api('/finance/profile', { method: 'PATCH', body: sent }) } catch (e) {
          ok = false
          toast.push(`Couldn't save that change — ${e.message || 'please try again'}`, 'error')
        }
        // Let go of what this save covered (unless it changed again meanwhile); on a failure the
        // refresh then puts the server's value back on screen.
        for (const [k, v] of Object.entries(sent)) if (profileHold.current[k] === v) delete profileHold.current[k]
        await refresh()
        waiters.forEach((w) => w(ok))
      }, 400)
    })
  }, [refresh])

  // Load for whoever is signed in; wipe it the moment they sign out so the next person never sees it.
  // A cached copy (if any) goes on screen immediately; the server load then replaces it.
  const lastUser = useRef(userId)
  useEffect(() => {
    if (lastUser.current && lastUser.current !== userId) clearCachedSummary(lastUser.current)
    lastUser.current = userId
    profileHold.current = {}
    clearTimeout(profileTimer.current)
    pendingProfile.current = {}
    profileWaiters.current.forEach((w) => w(false))
    profileWaiters.current = []
    setData(EMPTY)
    setError(null)
    setLoaded(false)
    setFromCache(false)
    if (!userId) { setLoading(false); return }
    setLoading(true)
    let alive = true
    readCachedSummary(userId).then((cached) => {
      if (!alive || !cached) return
      setData((d) => (d === EMPTY ? { ...EMPTY, ...cached } : d))
      setLoaded((l) => { if (!l) setFromCache(true); return true })
    })
    refresh()
    return () => { alive = false }
  }, [userId, refresh])

  // Optimistic local change — the UI updates on the tap, and the caller's background refresh()
  // then brings in the server's truth. fn(data) returns the keys to replace.
  const patch = useCallback((fn) => setData((d) => ({ ...d, ...fn(d) })), [])

  const value = useMemo(() => ({
    data, loading, error, loaded, refresh, patch, saveProfile, fromCache,
    accent: data.profile?.accent_color || DEFAULT_ACCENT,
  }), [data, loading, error, loaded, refresh, patch, saveProfile, fromCache])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)
