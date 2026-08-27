'use client'

import { useState } from 'react'
import { Eye, Landmark, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { BankCardFace } from '@/components/shared/BankCardFace'
import { capitalizeFirst } from '@/lib/format'

const TYPE_LABEL = { bank_account: 'Bank account', debit_card: 'Debit card', credit_card: 'Credit card' }

function groupNumber(v) {
  return String(v || '').replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()
}

// Same flip mechanism as features/credit-cards/CreditCardFlip.jsx (pure CSS 3D transform, no
// library) — but unlike that card, the back never shows cached numbers. It starts masked and
// only decrypts on an explicit Reveal click; the revealed values live in local state only and
// are dropped the moment the card is flipped back or unmounted, never touching shared app state.
export function VaultCardFlip({ item, onEdit, onDelete }) {
  const [flipped, setFlipped] = useState(false)
  const [secrets, setSecrets] = useState(null)
  const [revealing, setRevealing] = useState(false)
  const stop = (fn) => (e) => { e.stopPropagation(); fn() }

  const flipBack = () => { setFlipped(false); setSecrets(null) }

  const reveal = async () => {
    setRevealing(true)
    try {
      const res = await fetch(`/api/finance/vault_items/${item.id}/reveal`, { method: 'POST' })
      if (res.ok) setSecrets((await res.json()).secrets)
    } finally { setRevealing(false) }
  }

  const isCard = item.item_type === 'debit_card' || item.item_type === 'credit_card'

  return (
    <div className="mx-auto aspect-[85/54] w-full max-w-[340px] cursor-pointer select-none" style={{ perspective: '1500px' }} onClick={() => setFlipped((f) => !f)}>
      <div className="relative h-full w-full transition-transform duration-700 ease-out" style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'none' }}>
        <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
          {isCard ? (
            <BankCardFace name={item.label} subtitle={item.bank_name || TYPE_LABEL[item.item_type]} last4={item.last4} color={item.color || '#a78bfa'} fill />
          ) : (
            <div className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl p-4 shadow-lg" style={{ background: `linear-gradient(135deg, ${item.color || '#22d3ee'} 0%, ${item.color || '#22d3ee'}cc 45%, #0b0f18 100%)` }}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/[.06]" />
              <div className="relative flex items-start justify-between">
                <Landmark size={18} className="text-white/80" />
              </div>
              <div className="relative">
                <div className="text-xs font-semibold leading-tight text-white sm:text-sm">{item.label}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-white/60 sm:text-[10px]">
                  {item.bank_name && <span className="truncate">{item.bank_name}</span>}
                  {item.bank_name && item.last4 && <span>·</span>}
                  {item.last4 && <span className="shrink-0">••{item.last4}</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-white/10 bg-[#141a28] p-3.5 shadow-lg" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">{item.label}</div>
                <div className="mt-0.5 text-[11px] text-slate-500">{TYPE_LABEL[item.item_type]}{item.bank_name ? ` · ${item.bank_name}` : ''}</div>
              </div>
              <button type="button" onClick={stop(flipBack)} title="Flip back" className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-white"><RotateCcw size={13} /></button>
            </div>

            {!secrets ? (
              <div className="mt-4 flex flex-col items-center gap-2 py-4">
                <button type="button" onClick={stop(reveal)} disabled={revealing} className="flex items-center gap-1.5 rounded-lg bg-white/[.06] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/[.1] disabled:opacity-50">
                  <Eye size={13} />{revealing ? 'Decrypting…' : 'Tap to reveal'}
                </button>
              </div>
            ) : (
              <div className="mt-3 space-y-1.5 font-mono text-[11px] text-slate-200">
                {item.item_type === 'bank_account' ? (
                  <>
                    <div>Acc no: <span className="text-white">{secrets.account_number || '—'}</span></div>
                    <div>IFSC: <span className="text-white">{secrets.ifsc_code || '—'}</span></div>
                    {secrets.branch && <div>Branch: <span className="text-white">{secrets.branch}</span></div>}
                  </>
                ) : (
                  <>
                    <div className="tracking-[0.15em] text-white">{groupNumber(secrets.card_number) || '—'}</div>
                    <div>Expiry: <span className="text-white">{secrets.expiry_month || '--'}/{secrets.expiry_year || '--'}</span> &nbsp; CVV: <span className="text-white">{secrets.cvv || '—'}</span></div>
                    {secrets.pin && <div>PIN: <span className="text-white">{secrets.pin}</span></div>}
                  </>
                )}
                {secrets.notes && <div className="pt-1 text-slate-400">{capitalizeFirst(secrets.notes)}</div>}
              </div>
            )}
          </div>

          <div className="flex gap-1.5">
            <button type="button" onClick={stop(() => onEdit(item))} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/[.06] py-1.5 text-[11px] font-semibold text-white hover:bg-white/[.1]"><Pencil size={12} />Edit</button>
            <button type="button" onClick={stop(() => onDelete(item))} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-300/20 py-1.5 text-[11px] font-semibold text-rose-300 hover:bg-rose-300/10"><Trash2 size={12} />Delete</button>
          </div>
        </div>
      </div>
    </div>
  )
}
