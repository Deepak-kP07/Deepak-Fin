import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { DEFAULT_ACCENT } from '../lib/theme'
import { useAuth } from './AuthProvider'

const EMPTY = { accounts: [], categories: [], transactions: [], credit_cards: [], profile: null }
const DataContext = createContext(null)

// One /finance/summary load hydrates everything, the same model as the web app: mutations call
// their endpoint, then refresh().
export function DataProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const summary = await api('/finance/summary')
      setData({ ...EMPTY, ...summary })
      setError(null)
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
    if (!userId) { setLoading(false); return }
    setLoading(true)
    refresh()
  }, [userId, refresh])

  const value = useMemo(() => ({
    data, loading, error, refresh,
    accent: data.profile?.accent_color || DEFAULT_ACCENT,
  }), [data, loading, error, refresh])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)
