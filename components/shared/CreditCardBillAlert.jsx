'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { cardsDueSoon } from '@/lib/creditCards'
import { money } from '@/lib/format'

const DISMISS_STORAGE_KEY = 'dismissedBillAlerts'
const dueDateKey = (due) => due.toISOString().slice(0, 10)

// Surfaces any credit card whose bill is due soon (or overdue) and still unpaid — shown on both
// the Dashboard and the Transactions view so it's visible without having to drill into each
// card's own detail page. Recomputed live from `current_outstanding` + billing-cycle math on
// every render rather than stored anywhere, so it can never go stale and disappears the instant
// a bill is actually paid — no separate "placeholder" record to clean up.
export function CreditCardBillAlert({ creditCards = [], transactions = [], onPay, showMoney = true }) {
  const dueSoon = cardsDueSoon(creditCards, transactions)
  // Dismissing sticks per card+due-date in localStorage — Dashboard and Transactions each mount
  // their own instance of this component, so component-local state alone would forget the
  // dismissal the moment you switch modules. Keying by due date (not just card id) means it
  // naturally reappears once the bill is actually paid and the next cycle's due date rolls in.
  const [dismissed, setDismissed] = useState({})
  useEffect(() => {
    try { setDismissed(JSON.parse(localStorage.getItem(DISMISS_STORAGE_KEY) || '{}')) } catch { /* ignore */ }
  }, [])
  const dismissCard = (cardId, key) => {
    setDismissed((d) => {
      const next = { ...d, [cardId]: key }
      try { localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }
  const visible = dueSoon.filter(({ card, due }) => dismissed[card.id] !== dueDateKey(due))
  if (visible.length === 0) return null

  return (
    <div className="shrink-0 space-y-2">
      {visible.map(({ card, days, due }) => {
        const overdue = days < 0
        return (
          <div key={card.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${overdue ? 'border-rose-300/30 bg-rose-300/5 text-rose-200 light:text-rose-700' : 'border-amber-300/30 bg-amber-300/5 text-amber-200 light:text-amber-700'}`}>
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>
                <b>{card.name}</b> bill of {showMoney ? money(card.current_outstanding) : '••••'} is {overdue ? `overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}` : days === 0 ? 'due today' : `due in ${days} day${days === 1 ? '' : 's'}`}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button onClick={() => onPay(card)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${overdue ? 'bg-rose-300/20 text-rose-100 light:text-rose-800 hover:bg-rose-300/30' : 'bg-amber-300/20 text-amber-100 light:text-amber-800 hover:bg-amber-300/30'}`}>Pay now</button>
              <button onClick={() => dismissCard(card.id, dueDateKey(due))} className="rounded-lg p-1 opacity-60 transition hover:bg-white/10 hover:opacity-100" title="Dismiss"><X size={14} /></button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
