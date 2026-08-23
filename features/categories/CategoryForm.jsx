'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Select } from '@/components/shared/Select'
import { ColorPicker } from '@/components/shared/ColorPicker'

export function CategoryForm({ open, onClose, onSaved, editing, defaultType, toast }) {
  const initial = editing ? { ...editing } : { name: '', type: defaultType || 'expense', color: '#fb7185', icon: 'tag' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(initial) }, [editing, open, defaultType])
  if (!open) return null
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const endpoint = editing ? `/api/finance/categories/${editing.id}` : '/api/finance/categories'
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
      toast.push(editing ? 'Category updated' : 'Category added')
      onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{editing ? 'Edit category' : 'Add category'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-4">
          <label className="text-sm text-slate-300">Name
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Groceries" />
          </label>
          <label className="text-sm text-slate-300">Type
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </Select>
          </label>
          <div className="text-sm text-slate-300">Colour
            <ColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} />
          </div>
        </div>
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update' : 'Save category'}</button>
      </form>
    </div>
  )
}
