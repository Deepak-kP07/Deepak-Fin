import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
import { DEFAULT_ACCENT } from '../lib/theme'
import { useAuth } from './AuthProvider'
import { clearCachedSummary, readCachedSummary, writeCachedSummary } from '../lib/dataCache'

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

  const refresh = useCallback(async () => {
    const forUser = userRef.current
    try {
      const summary = await api('/finance/summary')
      if (userRef.current !== forUser) return
      setData({ ...EMPTY, ...summary })
      setError(null)
      setLoaded(true)
      setFromCache(false)
      if (forUser) writeCachedSummary(forUser, summary)
    } catch (e) {
      setError(e.message || 'Could not load your data')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load for whoever is signed in; wipe it the moment they sign out so the next person never sees it.
  // A cached copy (if any) goes on screen immediately; the server load then replaces it.
  const lastUser = useRef(userId)
  useEffect(() => {
    if (lastUser.current && lastUser.current !== userId) clearCachedSummary(lastUser.current)
    lastUser.current = userId
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
    data, loading, error, loaded, refresh, patch, fromCache,
    accent: data.profile?.accent_color || DEFAULT_ACCENT,
  }), [data, loading, error, loaded, refresh, patch, fromCache])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)
