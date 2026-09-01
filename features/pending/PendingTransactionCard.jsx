'use client'

import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Check, X } from 'lucide-react'
import { Select } from '@/components/shared/Select'
import { capitalizeFirst, relativeTime } from '@/lib/format'

// One approval card per pending SMS-detected transaction. Editing and approving are the same
// action — there's no separate "save edit" step (see app/page.js's approvePending) — so amount/
// description/category/account are always inline-editable, and whatever's in local state at the
// moment Approve is tapped is what gets sent. Buttons-only (no swipe) — see the plan's decision.
export function PendingTransactionCard({ pending, accounts, creditCards = [], categories, onApprove, onReject }) {
  const isIncome = pending.type === 'income'
  const [amount, setAmount] = useState(pending.amount ?? '')
  const [description, setDescription] = useState(pending.description || pending.merchant || '')
  const [categoryId, setCategoryId] = useState(pending.suggested_category_id || '')
  const [destination, setDestination] = useState(pending.credit_card_id ? `cc:${pending.credit_card_id}` : pending.account_id || '')
  const [busy, setBusy] = useState(false)

  const relevantCategories = categories.filter((c) => c.type === (isIncome ? 'income' : 'expense'))

  const overrides = () => {
    const isCard = typeof destination === 'string' && destination.startsWith('cc:')
    return {
      amount: Number(amount),
      description,
      suggested_category_id: categoryId || null,
      account_id: isCard ? null : destination || null,
      credit_card_id: isCard ? destination.slice(3) : null,
    }
  }

  const approve = async () => { setBusy(true); try { await onApprove(pending, overrides()) } finally { setBusy(false) } }
  const reject = async () => { setBusy(true); try { await onReject(pending) } finally { setBusy(false) } }

  return (
    <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[.05] light:bg-black/[.035] ${isIncome ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700'}`}>
          {isIncome ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
        </div>
        <div className="min-w-0 flex-1 truncate text-[11px] text-slate-500">{capitalizeFirst(pending.sender_id)} · {relativeTime(pending.created_at)}</div>
        <div className={`flex shrink-0 items-center text-sm font-semibold ${isIncome ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700'}`}>
          {isIncome ? '+' : '-'}
          <input
            type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-20 bg-transparent text-right outline-none"
          />
        </div>
      </div>

      {/* Pulled out of the header row and given the same visible-field treatment as
          Category/Account below — a borderless input sitting next to the icon read as a plain
          heading, not something tappable, which is exactly why it needed correcting. */}
      <label className="mt-3 block text-xs text-slate-500">Description
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What was this for?"
          className="mt-1 w-full rounded-lg border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-2.5 py-2 text-sm text-white light:text-slate-900 outline-none focus:border-accent-300/50"
        />
      </label>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} placeholder="Category" className="w-full rounded-lg border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-2.5 py-2 text-xs text-white light:text-slate-900 outline-none">
          <option value="">Uncategorised</option>
          {relevantCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Account" className="w-full rounded-lg border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-2.5 py-2 text-xs text-white light:text-slate-900 outline-none">
          <option value="">Choose account…</option>
          {accounts.filter((a) => a.type !== 'debit_card').map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          {isIncome ? null : creditCards.map((c) => <option key={c.id} value={`cc:${c.id}`}>{c.name} (card)</option>)}
        </Select>
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={reject} disabled={busy} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-300/20 bg-rose-300/5 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-300/10 disabled:opacity-50"><X size={16} />Reject</button>
        <button onClick={approve} disabled={busy || !(Number(amount) > 0) || !destination} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 py-3 text-sm font-semibold text-[#07101c] disabled:opacity-50"><Check size={16} />Approve</button>
      </div>
    </div>
  )
}
