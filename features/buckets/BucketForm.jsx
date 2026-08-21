'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Select } from '@/components/shared/Select'
import { DateInput } from '@/components/shared/DateInput'

export function BucketForm({ open, onClose, onSaved, editing, toast }) {
  const initial = editing ? { ...editing, estimated_cost: String(editing.estimated_cost) } : { title: '', estimated_cost: '', priority: 'medium', target_date: '', status: 'wishlist', notes: '' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(initial) }, [editing, open])
  if (!open) return null
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const endpoint = editing ? `/api/finance/bucket_list/${editing.id}` : '/api/finance/bucket_list'
      const payload = { ...form, estimated_cost: Number(form.estimated_cost), target_date: form.target_date || null }
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
      toast.push(editing ? 'Updated' : 'Added to bucket list'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{editing ? 'Edit dream' : 'Add to bucket list'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-4">
          <label className="text-sm text-slate-300">Title
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Trip to Iceland" />
          </label>
          <label className="text-sm text-slate-300">Estimated cost
            <input required type="number" step="0.01" min="0" value={form.estimated_cost} onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="250000" />
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[{ v: 'low', l: 'Low' }, { v: 'medium', l: 'Medium' }, { v: 'high', l: 'High' }, { v: 'dream', l: 'Dream' }].map((p) => (
              <button key={p.v} type="button" onClick={() => setForm({ ...form, priority: p.v })} className={`rounded-xl border px-2 py-2 text-xs font-medium transition ${form.priority === p.v ? 'border-cyan-400/30 bg-cyan-400/15 text-cyan-200' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>{p.l}</button>
            ))}
          </div>
          <label className="text-sm text-slate-300">Target date
            <DateInput value={form.target_date || ''} onChange={(e) => setForm({ ...form, target_date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300">Status
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
              <option value="wishlist">Wishlist</option><option value="saving">Saving</option><option value="achieved">Achieved</option>
            </Select>
          </label>
          <label className="text-sm text-slate-300">Notes
            <input value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Why this matters" />
          </label>
        </div>
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update' : 'Add to list'}</button>
      </form>
    </div>
  )
}
