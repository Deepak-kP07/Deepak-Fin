'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Select } from '@/components/shared/Select'
import { CategorySelect } from '@/components/shared/CategorySelect'
import { DateInput } from '@/components/shared/DateInput'
import { todayISO } from '@/lib/format'

export function RecurringForm({ open, onClose, onSaved, editing, accounts, categories, toast }) {
  const initial = editing
    ? { ...editing, amount: String(editing.amount) }
    : { account_id: accounts[0]?.id || '', category_id: '', type: 'expense', amount: '', description: '', notes: '', frequency: 'monthly', day_of_month: String(new Date().getDate()), next_due_date: todayISO(), is_active: true }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(initial) }, [editing, open])
  if (!open) return null
  const catsForType = categories.filter((c) => c.type === form.type && !(c.hidden_in_modules || []).includes('recurring'))
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const endpoint = editing ? `/api/finance/recurring_transactions/${editing.id}` : '/api/finance/recurring_transactions'
      const payload = { ...form, amount: Number(form.amount), category_id: form.category_id || null, day_of_month: form.day_of_month ? Number(form.day_of_month) : null }
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
      toast.push(editing ? 'Recurring rule updated' : 'Recurring rule added — it\'ll auto-log from its next due date')
      onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white light:text-slate-900">{editing ? 'Edit recurring rule' : 'New recurring transaction'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 light:text-slate-500 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-4">
          <div className="grid grid-cols-2 gap-2">
            {[{ v: 'expense', l: 'Expense' }, { v: 'income', l: 'Income' }].map((t) => (
              <button key={t.v} type="button" onClick={() => setForm({ ...form, type: t.v, category_id: '' })} className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${form.type === t.v ? 'border-accent-400/30 bg-accent-400/15 text-accent-200 light:text-accent-700' : 'border-white/10 light:border-black/10 text-slate-400 light:text-slate-500 hover:bg-white/5'}`}>{t.l}</button>
            ))}
          </div>
          <label className="text-sm text-slate-300 light:text-slate-700">Description
            <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="e.g. Rent, Salary, Netflix" />
          </label>
          <label className="text-sm text-slate-300 light:text-slate-700">Amount
            <input required type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
          </label>
          <label className="text-sm text-slate-300 light:text-slate-700">Account
            <Select required value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none">
              <option value="">Choose account…</option>
              {accounts.filter((a) => a.type !== 'debit_card').map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </label>
          <label className="text-sm text-slate-300 light:text-slate-700">Category
            <CategorySelect value={form.category_id || ''} onChange={(e) => setForm({ ...form, category_id: e.target.value })} categories={catsForType} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-slate-300 light:text-slate-700">Repeats
              <Select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none">
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </Select>
            </label>
            <label className="text-sm text-slate-300 light:text-slate-700">Next due
              <DateInput value={form.next_due_date} onChange={(e) => setForm({ ...form, next_due_date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
            </label>
          </div>
          <div className="text-[11px] text-slate-500">Any occurrences already due by the time you save will be logged immediately, then it repeats {form.frequency} from there.</div>
          <label className="text-sm text-slate-300 light:text-slate-700">Notes
            <input value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="Optional" />
          </label>
        </div>
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update rule' : 'Save recurring rule'}</button>
      </form>
    </div>
  )
}
