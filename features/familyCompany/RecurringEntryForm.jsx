'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Select } from '@/components/shared/Select'
import { CategorySelect } from '@/components/shared/CategorySelect'
import { DateInput } from '@/components/shared/DateInput'
import { ENTRY_TYPE_STYLE, ENTRY_TYPES } from '@/lib/moneyProfiles'
import { todayISO } from '@/lib/format'

export function RecurringEntryForm({ open, onClose, onSaved, editing, profile, accounts = [], creditCards = [], categories = [], toast }) {
  // Mutually-exclusive account_id/credit_card_id collapsed into one `account_id` form field via
  // the same `cc:<uuid>` sentinel used in MoneyProfileEntryForm/the main Transaction form.
  const initial = editing
    ? { ...editing, amount: String(editing.amount), account_id: editing.credit_card_id ? `cc:${editing.credit_card_id}` : editing.account_id || profile?.linked_account_id || '' }
    : { entry_type: 'expense', category_id: '', account_id: profile?.linked_account_id || '', description: '', amount: '', paid_party: '', notes: '', frequency: 'monthly', next_due_date: todayISO(), is_active: true }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(initial) }, [editing, open, profile?.id])
  if (!open || !profile) return null

  const catType = form.entry_type === 'expense' ? 'expense' : 'income'
  const catsForType = categories.filter((c) => c.type === catType && !(c.hidden_in_modules || []).includes('family_company'))

  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const endpoint = editing ? `/api/finance/recurring_money_profile_entries/${editing.id}` : '/api/finance/recurring_money_profile_entries'
      const isCard = typeof form.account_id === 'string' && form.account_id.startsWith('cc:')
      const payload = {
        profile_id: profile.id, entry_type: form.entry_type, category_id: form.category_id || null,
        account_id: isCard ? null : form.account_id || null, credit_card_id: isCard ? form.account_id.slice(3) : null,
        description: form.description, amount: Number(form.amount), paid_party: form.paid_party || null, notes: form.notes || null,
        frequency: form.frequency, next_due_date: form.next_due_date, is_active: form.is_active,
      }
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
      toast.push(editing ? 'Recurring rule updated' : 'Recurring rule added — it\'ll auto-log from its next due date')
      onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white light:text-slate-900">{editing ? 'Edit recurring rule' : `New recurring entry · ${profile.name}`}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 light:text-slate-500 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-4">
          <div className="grid grid-cols-3 gap-2">
            {ENTRY_TYPES.map((t) => (
              <button key={t.value} type="button" onClick={() => setForm({ ...form, entry_type: t.value, category_id: '' })} className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${form.entry_type === t.value ? ENTRY_TYPE_STYLE[t.value] + ' border-transparent' : 'border-white/10 light:border-black/10 text-slate-400 light:text-slate-500 hover:bg-white/5'}`}>{t.label}</button>
            ))}
          </div>
          <label className="text-sm text-slate-300 light:text-slate-700">Description
            <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="e.g. Salary, Rent, Netflix" />
          </label>
          <label className="text-sm text-slate-300 light:text-slate-700">Amount
            <input required type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
          </label>
          <label className="text-sm text-slate-300 light:text-slate-700">Category <span className="text-xs text-slate-500">(optional)</span>
            <CategorySelect value={form.category_id || ''} onChange={(e) => setForm({ ...form, category_id: e.target.value })} categories={catsForType} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
          </label>
          <label className="text-sm text-slate-300 light:text-slate-700">Bank account or card <span className="text-xs text-slate-500">(optional)</span>
            <Select value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none">
              <option value="">Don't post to a bank account</option>
              {accounts.filter((a) => a.type !== 'debit_card').map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              {creditCards.map((c) => <option key={c.id} value={`cc:${c.id}`}>{c.name} (card)</option>)}
            </Select>
          </label>
          <label className="text-sm text-slate-300 light:text-slate-700">Paid to / Received from <span className="text-xs text-slate-500">(optional)</span>
            <input value={form.paid_party || ''} onChange={(e) => setForm({ ...form, paid_party: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
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
          <label className="text-sm text-slate-300 light:text-slate-700">Notes <span className="text-xs text-slate-500">(optional)</span>
            <input value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="Optional" />
          </label>
        </div>
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update rule' : 'Save recurring rule'}</button>
      </form>
    </div>
  )
}
