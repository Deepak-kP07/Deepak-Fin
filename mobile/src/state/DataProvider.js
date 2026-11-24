import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { DEFAULT_ACCENT } from '../lib/theme'
import { useAuth } from './AuthProvider'

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

  const refresh = useCallback(async () => {
    try {
      const summary = await api('/finance/summary')
      setData({ ...EMPTY, ...summary })
      setError(null)
      setLoaded(true)
    } catch (e) {
      setError(e.message || 'Could not load your data')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load for whoever is signed in; wipe it the moment they sign out so the next person never sees it.
  useEffect(() => {
    setData(EMPTY)
    setError(null)
    setLoaded(false)
    if (!userId) { setLoading(false); return }
    setLoading(true)
    refresh()
  }, [userId, refresh])

  // Optimistic local change — the UI updates on the tap, and the caller's background refresh()
  // then brings in the server's truth. fn(data) returns the keys to replace.
  const patch = useCallback((fn) => setData((d) => ({ ...d, ...fn(d) })), [])

  const value = useMemo(() => ({
    data, loading, error, loaded, refresh, patch,
    accent: data.profile?.accent_color || DEFAULT_ACCENT,
  }), [data, loading, error, loaded, refresh, patch])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)
