'use client'

import { AlertTriangle } from 'lucide-react'
import { cardsDueSoon } from '@/lib/creditCards'
import { money } from '@/lib/format'

// Surfaces any credit card whose bill is due soon (or overdue) and still unpaid — shown on both
// the Dashboard and the Transactions view so it's visible without having to drill into each
// card's own detail page. Recomputed live from `current_outstanding` + billing-cycle math on
// every render rather than stored anywhere, so it can never go stale and disappears the instant
// a bill is actually paid — no separate "placeholder" record to clean up.
export function CreditCardBillAlert({ creditCards = [], transactions = [], onPay, showMoney = true }) {
  const dueSoon = cardsDueSoon(creditCards, transactions)
  if (dueSoon.length === 0) return null

  return (
    <div className="shrink-0 space-y-2">
      {dueSoon.map(({ card, days }) => {
        const overdue = days < 0
        return (
          <div key={card.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${overdue ? 'border-rose-300/30 bg-rose-300/5 text-rose-200' : 'border-amber-300/30 bg-amber-300/5 text-amber-200'}`}>
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>
                <b>{card.name}</b> bill of {showMoney ? money(card.current_outstanding) : '••••'} is {overdue ? `overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}` : days === 0 ? 'due today' : `due in ${days} day${days === 1 ? '' : 's'}`}
              </span>
            </div>
            <button onClick={() => onPay(card)} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${overdue ? 'bg-rose-300/20 text-rose-100 hover:bg-rose-300/30' : 'bg-amber-300/20 text-amber-100 hover:bg-amber-300/30'}`}>Pay now</button>
          </div>
        )
      })}
    </div>
  )
}
