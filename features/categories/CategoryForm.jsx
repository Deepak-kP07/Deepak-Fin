'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Select } from '@/components/shared/Select'
import { ColorPicker } from '@/components/shared/ColorPicker'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useIsMobile } from '@/hooks/use-mobile'

function CategoryFormFields({ form, setForm }) {
  return (
    <div className="grid gap-4">
      <label className="text-sm text-slate-300 light:text-slate-700">Name
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="Groceries" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Type
        <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none">
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </Select>
      </label>
      <div className="text-sm text-slate-300 light:text-slate-700">Colour
        <ColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} />
      </div>
    </div>
  )
}

export function CategoryForm({ open, onClose, onSaved, editing, defaultType, toast, mutate }) {
  const initial = editing ? { ...editing } : { name: '', type: defaultType || 'expense', color: '#fb7185', icon: 'tag' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const isMobile = useIsMobile()
  useEffect(() => { setForm(initial) }, [editing, open, defaultType])
  if (!open) return null

  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const { queued } = await mutate({ table: 'categories', method: editing ? 'PATCH' : 'POST', id: editing?.id, body: form })
      toast.push(queued ? `Category ${editing ? 'updated' : 'added'} — will sync when back online` : `Category ${editing ? 'updated' : 'added'}`)
      onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }

  const submitButton = <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update' : 'Save category'}</button>

  // Mobile gets a real bottom sheet (drag-to-dismiss, edge-to-edge); desktop keeps the existing
  // centered modal — same fields, same save logic, just a different presentation shell.
  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title={editing ? 'Edit category' : 'Add category'}>
        <form onSubmit={save}>
          <CategoryFormFields form={form} setForm={setForm} />
          {submitButton}
        </form>
      </BottomSheet>
    )
  }

  return (
    // z-50, not the usual z-40 — this form is always opened from inside another already-open
    // z-40 modal (Transaction/Money-profile-entry/Budget-month's own "Add new category" pencil),
    // so it needs to out-rank that parent rather than tie with it (a z-index tie falls back to
    // DOM order, and this form's own place in app/page.js's JSX happens to render before those
    // parents, leaving it stuck behind them).
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white light:text-slate-900">{editing ? 'Edit category' : 'Add category'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 light:text-slate-500 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5">
          <CategoryFormFields form={form} setForm={setForm} />
        </div>
        {submitButton}
      </form>
    </div>
  )
}
