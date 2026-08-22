'use client'

import { useState } from 'react'
import { ArrowRight, RotateCcw } from 'lucide-react'
import { BankCardFace } from '@/components/shared/BankCardFace'
import { nextBillDue } from '@/lib/creditCards'
import { money } from '@/lib/format'

// The list only ever shows the card face — tap/click it to flip and reveal the numbers and
// quick actions on the back, same gesture as handling a real card. Nothing here needs its own
// route or modal; the flip state is purely local and resets whenever the card list re-renders.
// Kept to a real card's rough proportions (not stretched to fill the grid column) so it actually
// reads as a card. Edit/delete live on the full-details page, not here.
export function CreditCardFlip({ card, showMoney, onSpend, onPay, onViewDetails }) {
  const [flipped, setFlipped] = useState(false)
  const util = Number(card.credit_limit) > 0 ? Math.min(100, Math.round((Number(card.current_outstanding) / Number(card.credit_limit)) * 100)) : 0
  const tone = util >= 80 ? 'bg-rose-400' : util >= 50 ? 'bg-amber-400' : 'bg-emerald-400'
  const utilText = util >= 80 ? 'text-rose-300' : util >= 50 ? 'text-amber-300' : 'text-emerald-300'
  const nd = nextBillDue(card)
  const stop = (fn) => (e) => { e.stopPropagation(); fn() }

  return (
    <div className="mx-auto aspect-[85/54] w-full max-w-[340px] cursor-pointer select-none" style={{ perspective: '1500px' }} onClick={() => setFlipped((f) => !f)}>
      <div
        className="relative h-full w-full transition-transform duration-700 ease-out"
        style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'none' }}
      >
        <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
          <BankCardFace name={card.name} subtitle={card.bank || 'Credit card'} last4={card.last4} color={card.color || '#a78bfa'} fill />
        </div>

        <div
          className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-white/10 bg-[#141a28] p-3.5 shadow-lg"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">{card.name}</div>
                <div className="mt-0.5 text-[11px] text-slate-500">Bill on {card.billing_date} · Due in {nd.days > 0 ? `${nd.days}d` : nd.days === 0 ? 'today' : 'overdue'}</div>
              </div>
              <button type="button" onClick={stop(() => setFlipped(false))} title="Flip back" className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-white"><RotateCcw size={13} /></button>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <div className="text-[11px] text-slate-500">Outstanding</div>
                <div className="text-lg font-semibold text-white">{showMoney ? money(card.current_outstanding) : '••••'}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-500">Limit</div>
                <div className="text-xs text-slate-300">{showMoney ? money(card.credit_limit) : '••••'}</div>
              </div>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5"><div className={`h-full rounded-full ${tone} transition-all`} style={{ width: `${util}%` }} /></div>
            <div className={`mt-1 text-[10px] ${utilText}`}>{util}% used</div>
          </div>

          <div className="space-y-1.5">
            <div className="flex gap-1.5">
              <button type="button" onClick={stop(() => onSpend(card))} className="flex-1 rounded-lg bg-white/[.06] py-1.5 text-[11px] font-semibold text-white hover:bg-white/[.1]">+ Log spend</button>
              <button type="button" onClick={stop(() => onPay(card))} disabled={Number(card.current_outstanding) <= 0} className="flex-1 rounded-lg bg-gradient-to-r from-cyan-300 to-blue-500 py-1.5 text-[11px] font-semibold text-[#07101c] disabled:opacity-50">Pay bill</button>
            </div>
            <button type="button" onClick={stop(() => onViewDetails(card))} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 py-1.5 text-[11px] font-medium text-cyan-200 hover:bg-white/5">View full details <ArrowRight size={12} /></button>
          </div>
        </div>
      </div>
    </div>
  )
}
