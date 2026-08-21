'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Select } from '@/components/shared/Select'
import { DateInput } from '@/components/shared/DateInput'
import { todayISO } from '@/lib/format'

export function ZopkitForm({ open, onClose, onSaved, editing, toast }) {
  const initial = editing
    ? { ...editing, amount: String(editing.amount), time: editing.time?.slice(0, 5) || new Date().toTimeString().slice(0, 5) }
    : { type: 'expense', amount: '', description: '', category: 'tools/subscriptions', date: todayISO(), time: new Date().toTimeString().slice(0, 5), added_by: 'self', notes: '' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(initial) }, [editing, open])
  if (!open) return null
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const endpoint = editing ? `/api/finance/zopkit_transactions/${editing.id}` : '/api/finance/zopkit_transactions'
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: Number(form.amount) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not save')
      toast.push(editing ? 'Updated' : 'Logged'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }
  const cats = ['tools/subscriptions', 'team expenses', 'miscellaneous', 'other']
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{editing ? 'Edit entry' : 'Log Zopkit transaction'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {[{ v: 'expense', l: 'Expense', c: 'bg-rose-400/15 text-rose-200 border-rose-400/30' }, { v: 'income', l: 'Income (from CEO)', c: 'bg-emerald-400/15 text-emerald-200 border-emerald-400/30' }].map((t) => (
            <button key={t.v} type="button" onClick={() => setForm({ ...form, type: t.v, added_by: t.v === 'income' ? 'ceo' : 'self' })} className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${form.type === t.v ? t.c : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>{t.l}</button>
          ))}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-300">Amount
            <input required type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300">Category
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </label>
          <label className="text-sm text-slate-300 sm:col-span-2">Description
            <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Vercel subscription" />
          </label>
          <label className="text-sm text-slate-300">Date
            <DateInput value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value, time: new Date().toTimeString().slice(0, 5) })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300">Added by
            <Select value={form.added_by} onChange={(e) => setForm({ ...form, added_by: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
              <option value="self">Self</option><option value="ceo">CEO</option>
            </Select>
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
