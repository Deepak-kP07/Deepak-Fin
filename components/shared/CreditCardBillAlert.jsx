'use client'

import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { cardsDueSoon } from '@/lib/creditCards'
import { money } from '@/lib/format'

// Surfaces any credit card whose bill is due soon (or overdue) and still unpaid — shown on both
// the Dashboard and the Transactions view so it's visible without having to drill into each
// card's own detail page. Recomputed live from `current_outstanding` + billing-cycle math on
// every render rather than stored anywhere, so it can never go stale and disappears the instant
// a bill is actually paid — no separate "placeholder" record to clean up.
export function CreditCardBillAlert({ creditCards = [], transactions = [], onPay, showMoney = true }) {
  const dueSoon = cardsDueSoon(creditCards, transactions)
  // Dismissing just hides it for this visit — reappears next time you land here if the bill is
  // still unpaid, same as every other status banner in the app.
  const [dismissed, setDismissed] = useState(new Set())
  const visible = dueSoon.filter(({ card }) => !dismissed.has(card.id))
  if (visible.length === 0) return null

  return (
    <div className="shrink-0 space-y-2">
      {visible.map(({ card, days }) => {
        const overdue = days < 0
        return (
          <div key={card.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${overdue ? 'border-rose-300/30 bg-rose-300/5 text-rose-200' : 'border-amber-300/30 bg-amber-300/5 text-amber-200'}`}>
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>
                <b>{card.name}</b> bill of {showMoney ? money(card.current_outstanding) : '••••'} is {overdue ? `overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}` : days === 0 ? 'due today' : `due in ${days} day${days === 1 ? '' : 's'}`}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button onClick={() => onPay(card)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${overdue ? 'bg-rose-300/20 text-rose-100 hover:bg-rose-300/30' : 'bg-amber-300/20 text-amber-100 hover:bg-amber-300/30'}`}>Pay now</button>
              <button onClick={() => setDismissed((d) => new Set(d).add(card.id))} className="rounded-lg p-1 opacity-60 transition hover:bg-white/10 hover:opacity-100" title="Dismiss"><X size={14} /></button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
