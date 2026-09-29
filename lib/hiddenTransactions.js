'use client'

import { createContext, createElement, useCallback, useContext, useEffect, useState } from 'react'

// Whether hidden transactions are currently unlocked. In memory only — never persisted — and
// re-locked whenever the app goes to the background, so handing the phone over (or leaving it)
// never leaves them visible.
const HiddenTxContext = createContext({ revealed: false, unlock: async () => ({ ok: false }), lock: () => {} })

export function HiddenTxProvider({ children }) {
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'hidden') setRevealed(false) }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])
  const unlock = useCallback(async (pin) => {
    const res = await fetch('/api/finance/hidden_pin/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: data.error || 'Could not check PIN' }
    setRevealed(true)
    return { ok: true }
  }, [])
  const lock = useCallback(() => setRevealed(false), [])
  return createElement(HiddenTxContext.Provider, { value: { revealed, unlock, lock } }, children)
}

export const useHiddenTx = () => useContext(HiddenTxContext)

// A transfer is two rows sharing transfer_group_id; if either side is hidden, both are.
export function isHiddenTx(t, hiddenGroups) {
  return !!t?.is_hidden || (!!t?.transfer_group_id && hiddenGroups.has(t.transfer_group_id))
}

export function hiddenTransferGroups(transactions) {
  return new Set((transactions || []).filter((t) => t.is_hidden && t.transfer_group_id).map((t) => t.transfer_group_id))
}

// The rows a list may show by name. Totals, charts and balances must keep using the full array —
// only row-rendering and exports go through this.
export function listableTransactions(transactions, revealed) {
  if (revealed) return transactions || []
  const groups = hiddenTransferGroups(transactions)
  return (transactions || []).filter((t) => !isHiddenTx(t, groups))
}

async function postPin(path, body) {
  const res = await fetch(`/api/finance/hidden_pin${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
  const data = await res.json().catch(() => ({}))
  return res.ok ? { ok: true } : { ok: false, error: data.error || 'Something went wrong' }
}

export const resetHiddenPin = () => postPin('/reset')

// Set a first PIN, or change an existing one (asks for the current PIN first), via usePinDialog's
// `ask`. Resolves true once the new PIN is saved.
export async function runPinSetup(ask, hasPin) {
  let current
  if (hasPin) {
    const ok = await ask({ title: 'Enter your current PIN', confirmLabel: 'Next', submit: async (p) => { current = p; return postPin('/verify', { pin: p }) } })
    if (!ok) return false
  }
  let first
  const ok = await ask({ title: hasPin ? 'Choose a new PIN' : 'Create a PIN', message: "4 to 6 digits. You'll need it to see hidden transactions.", confirmLabel: 'Next', submit: async (p) => { first = p; return { ok: true } } })
  if (!ok) return false
  return ask({ title: 'Confirm your PIN', confirmLabel: 'Save PIN', submit: async (p) => (p === first ? postPin('', { pin: p, current_pin: current }) : { ok: false, error: "PINs don't match — try again." }) })
}

// Hook form: the listable rows for the current lock state.
export function useListableTransactions(transactions) {
  const { revealed } = useHiddenTx()
  return listableTransactions(transactions, revealed)
}
