import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { api } from '../lib/api'

// Port of the web's HiddenTxProvider: hidden transactions unlock with the PIN, in memory only,
// and re-lock as soon as the app goes to the background.
const Ctx = createContext({ revealed: false, unlock: async () => ({ ok: false }), lock: () => {} })
export function HiddenTxProvider({ children }) {
  const [revealed, setRevealed] = useState(false)
  useEffect(() => { const sub = AppState.addEventListener('change', (s) => { if (s !== 'active') setRevealed(false) }); return () => sub.remove() }, [])
  const unlock = useCallback(async (pin) => {
    try { await api('/finance/hidden_pin/verify', { method: 'POST', body: { pin } }); setRevealed(true); return { ok: true } }
    catch (e) { return { ok: false, error: e.message || 'Could not check PIN' } }
  }, [])
  const lock = useCallback(() => setRevealed(false), [])
  return <Ctx.Provider value={{ revealed, unlock, lock }}>{children}</Ctx.Provider>
}
export const useHiddenTx = () => useContext(Ctx)

export function hiddenTransferGroups(transactions) {
  return new Set((transactions || []).filter((t) => t.is_hidden && t.transfer_group_id).map((t) => t.transfer_group_id))
}
export const isHiddenTx = (t, groups) => !!t?.is_hidden || (!!t?.transfer_group_id && groups.has(t.transfer_group_id))
