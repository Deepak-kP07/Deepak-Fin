'use client'

import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Check, Inbox, X } from 'lucide-react'
import { capitalizeFirst, money } from '@/lib/format'

// Inline approve/reject, right where transactions already live — the "Pending" nav tab (see
// features/pending/PendingTransactionsView.jsx) still exists for full inline-editable correction,
// but for a well-formed message this is the one-tap path: approve with whatever the parsing
// engine + last4/category matching already resolved (lib/server/genericCrud.js's
// pending_transactions branch), no navigation required. Shown unconditionally — not scoped to
// the ledger's current month/filters — since these need attention regardless of what's browsed.
export function PendingSmsBanner({ pending, showMoney, onApprove, onReject }) {
  const [busyId, setBusyId] = useState(null)
  if (!pending || pending.length === 0) return null

  const approve = async (p) => { setBusyId(p.id); try { await onApprove(p, {}) } finally { setBusyId(null) } }
  const reject = async (p) => { setBusyId(p.id); try { await onReject(p) } finally { setBusyId(null) } }

  return (
    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 glassy:glass-card">
      <div className="flex items-center gap-2 border-b border-amber-300/10 px-4 py-2.5 text-xs uppercase tracking-widest text-amber-200/80 light:text-amber-700">
        <Inbox size={13} />Detected from SMS · {pending.length}
      </div>
      <div className="divide-y divide-amber-300/10">
        {pending.map((p) => {
          const isIncome = p.type === 'income'
          const busy = busyId === p.id
          return (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[.05] light:bg-black/[.035] ${isIncome ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700'}`}>
                {isIncome ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white light:text-slate-900">{capitalizeFirst(p.description || p.merchant || 'SMS transaction')}</div>
                <div className="truncate text-[11px] text-slate-500">{capitalizeFirst(p.sender_id)}</div>
              </div>
              <div className={`shrink-0 text-sm font-semibold ${isIncome ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700'}`}>
                {isIncome ? '+' : '-'}{showMoney ? money(p.amount) : '••••'}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button onClick={() => reject(p)} disabled={busy} title="Reject" className="rounded-lg p-1.5 text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10 disabled:opacity-40"><X size={16} /></button>
                <button onClick={() => approve(p)} disabled={busy} title="Approve" className="rounded-lg bg-emerald-400/15 p-1.5 text-emerald-200 light:text-emerald-700 hover:bg-emerald-400/25 disabled:opacity-40"><Check size={16} /></button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
