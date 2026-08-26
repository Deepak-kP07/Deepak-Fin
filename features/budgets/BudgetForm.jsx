'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { CategorySelect } from '@/components/shared/CategorySelect'
import { todayISO } from '@/lib/format'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useIsMobile } from '@/hooks/use-mobile'

function BudgetFormFields({ form, setForm, expenseCats }) {
  return (
    <div className="grid gap-4">
      <label className="text-sm text-slate-300 light:text-slate-700">Category
        <CategorySelect value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} categories={expenseCats} placeholder="Choose category…" className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Limit amount
        <input required type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="10000" />
      </label>
    </div>
  )
}

// Yearly budgets only now — the monthly path moved to BudgetMonthForm.jsx (an overall total plus
// a full category breakdown set together, with a close/log lifecycle). This form keeps its exact
// original per-category shape, just with the period fixed to 'yearly' instead of user-choosable.
export function BudgetForm({ open, onClose, onSaved, editing, categories, toast, mutate }) {
  const expenseCats = categories.filter((c) => c.type === 'expense' && !(c.hidden_in_modules || []).includes('budgets'))
  const initial = editing ? { ...editing, amount: String(editing.amount) } : { category_id: expenseCats[0]?.id || '', amount: '', period: 'yearly', start_date: todayISO() }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const isMobile = useIsMobile()
  useEffect(() => { setForm(initial) }, [editing, open])
  if (!open) return null

  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const { queued } = await mutate({ table: 'budgets', method: editing ? 'PATCH' : 'POST', id: editing?.id, body: { ...form, amount: Number(form.amount) } })
      toast.push((editing ? 'Budget updated' : 'Budget added') + (queued ? ' — will sync when back online' : '')); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }

  const fieldsProps = { form, setForm, expenseCats }
  const submitButton = <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update budget' : 'Save budget'}</button>

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title={editing ? 'Edit yearly budget' : 'Set a yearly budget'}>
        <form onSubmit={save}>
          <BudgetFormFields {...fieldsProps} />
          {submitButton}
        </form>
      </BottomSheet>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white light:text-slate-900">{editing ? 'Edit yearly budget' : 'Set a yearly budget'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 light:text-slate-500 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5">
          <BudgetFormFields {...fieldsProps} />
        </div>
        {submitButton}
      </form>
    </div>
  )
}
