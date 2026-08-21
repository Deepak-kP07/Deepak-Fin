'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { CategorySelect } from '@/components/shared/CategorySelect'
import { DateInput } from '@/components/shared/DateInput'
import { useConfirm } from '@/components/shared/ConfirmDialog'
import { money, todayISO } from '@/lib/format'

export function CardSpendForm({ open, onClose, onSaved, card, categories, toast }) {
  const initial = { amount: '', description: '', category_id: '', date: todayISO(), time: new Date().toTimeString().slice(0, 5), notes: '' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const confirm = useConfirm()
  useEffect(() => { if (open) setForm(initial) }, [open])
  if (!open || !card) return null
  // Credit cards can never go past their own limit — a hard stop, no override. Between 30%
  // and the limit it's a "Confirm" prompt instead, same shape as the bank/cash one.
  const checkLimit = async () => {
    const amount = Number(form.amount)
    const limit = Number(card.credit_limit || 0)
    if (!(amount > 0) || limit <= 0) return true
    const pct = ((Number(card.current_outstanding || 0) + amount) / limit) * 100
    if (pct >= 100) {
      await confirm.ask(`"${card.name}" only has ${money(Math.max(0, limit - Number(card.current_outstanding || 0)))} of headroom left — this would go over its credit limit.`, { okOnly: true })
      return false
    }
    if (pct > 30) {
      return confirm.ask(`This puts "${card.name}" at ${Math.round(pct)}% of its limit — best practice is staying under 30–40%. Do you want to confirm this payment anyway?`, { confirmLabel: 'Confirm' })
    }
    return true
  }
  const save = async (e) => {
    e.preventDefault()
    if (!(await checkLimit())) return
    setBusy(true)
    try {
      // Posting to /finance/transactions (not the old dedicated /finance/credit_card_transactions
      // endpoint) with credit_card_id is the same path TransactionForm already uses for a
      // card-funded expense — it resolves to linked_module: 'credit_card' server-side, bumps the
      // card's outstanding the same way, and — the actual point of the change — shows up as a
      // real transaction everywhere else in the app (Transactions list, Insights, exports)
      // instead of living only in this card's own log.
      const response = await fetch('/api/finance/transactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credit_card_id: card.id, type: 'expense', amount: Number(form.amount), description: form.description, category_id: form.category_id || null, date: form.date, time: form.time, notes: form.notes || null }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
      toast.push('Spend logged'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }
  const expenseCats = categories.filter((c) => c.type === 'expense')
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Log spend</h2>
            <p className="mt-1 text-xs text-slate-500">{card.name} · outstanding {money(card.current_outstanding)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-4">
          <label className="text-sm text-slate-300">Amount
            <input required type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300">Description
            <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Swiggy order" />
          </label>
          <label className="text-sm text-slate-300">Category
            <CategorySelect value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} categories={expenseCats} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300">Date
            <DateInput value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value, time: new Date().toTimeString().slice(0, 5) })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
        </div>
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : 'Log spend'}</button>
      </form>
      {confirm.view}
    </div>
  )
}
