'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Select } from '@/components/shared/Select'
import { DateInput } from '@/components/shared/DateInput'
import { todayISO } from '@/lib/format'

export function LendForm({ open, onClose, onSaved, editing, accounts, creditCards = [], toast }) {
  const initial = editing
    ? { ...editing, amount: String(editing.amount) }
    : { person_name: '', type: 'lent', amount: '', date: todayISO(), due_date: '', from_account_id: accounts[0]?.id || '', reason: '', notes: '' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(initial) }, [editing, open])
  if (!open) return null
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const endpoint = editing ? `/api/finance/lend_borrow/${editing.id}` : '/api/finance/lend_borrow'
      const payload = { ...form, amount: Number(form.amount), due_date: form.due_date || null }
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
      toast.push(editing ? 'Updated' : 'Recorded'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{editing ? 'Edit record' : 'Log lend or borrow'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {[{ v: 'lent', l: 'I lent' }, { v: 'borrowed', l: 'I borrowed' }].map((t) => (
            <button key={t.v} type="button" onClick={() => setForm({ ...form, type: t.v, from_account_id: t.v === 'borrowed' && String(form.from_account_id || '').startsWith('cc:') ? '' : form.from_account_id })} className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${form.type === t.v ? 'border-cyan-400/30 bg-cyan-400/15 text-cyan-200' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>{t.l}</button>
          ))}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-300 sm:col-span-2">Person name
            <input required value={form.person_name} onChange={(e) => setForm({ ...form, person_name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Rohan" />
          </label>
          <label className="text-sm text-slate-300">Amount
            <input required type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300">Date
            <DateInput value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300">{form.type === 'lent' ? 'From account' : 'To account'}
            <Select value={form.from_account_id || ''} onChange={(e) => setForm({ ...form, from_account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
              <option value="">None (skip account impact)</option>
              {accounts.filter((a) => a.type !== 'debit_card').map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              {form.type === 'lent' && creditCards.map((c) => <option key={c.id} value={`cc:${c.id}`}>{c.name} (card)</option>)}
            </Select>
          </label>
          <label className="text-sm text-slate-300">Due date (optional)
            <DateInput value={form.due_date || ''} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300 sm:col-span-2">Reason
            <input value={form.reason || ''} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Rent help, exam fees…" />
          </label>
          <label className="text-sm text-slate-300 sm:col-span-2">Notes
            <input value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
        </div>
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update' : 'Save'}</button>
      </form>
    </div>
  )
}
