'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react'
import { CategorySelect } from '@/components/shared/CategorySelect'
import { monthLabel } from '@/lib/budgets'
import { money } from '@/lib/format'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useIsMobile } from '@/hooks/use-mobile'

// Sets an entire month's budget in one go — an overall total plus however many category
// breakdowns the user wants, submitted together via /finance/budget_months/save rather than
// one category at a time like the old per-row form. The month itself is a cursor owned by this
// form (prev/next, like every other month-scoped view in this app) rather than fixed to
// whichever month it was opened for — lets you plan a future month ahead of time, or back-fill
// a past one you never got around to, not just edit the real current month.
//
// Entirely online-only — /budget_months/save is a genuinely atomic multi-row, multi-table batch
// save (upserts the total, then replaces the whole category-line set) with live server-side
// over-allocation validation and a closed-month guard; an offline optimistic replay could
// silently violate that race-safety or bypass the validation, so this doesn't go through
// mutate(). Only the BottomSheet/desktop-modal presentation shell is being converted here.
export function BudgetMonthForm({ open, onClose, onSaved, initialYear, initialMonth, budgetMonths = [], budgetMonthCategories = [], categories, onAddCategory, toast }) {
  const [cursor, setCursor] = useState({ year: initialYear, month: initialMonth })
  const isMobile = useIsMobile()
  useEffect(() => { if (open) setCursor({ year: initialYear, month: initialMonth }) }, [open, initialYear, initialMonth])
  const shiftMonth = (delta) => setCursor((c) => { const d = new Date(c.year, c.month + delta, 1); return { year: d.getFullYear(), month: d.getMonth() } })

  const existingPlan = budgetMonths.find((p) => p.year === cursor.year && p.month === cursor.month)
  const existingLines = existingPlan ? budgetMonthCategories.filter((l) => l.budget_month_id === existingPlan.id) : []
  const isClosed = existingPlan?.status === 'closed'

  const expenseCats = categories.filter((c) => c.type === 'expense' && !(c.hidden_in_modules || []).includes('budgets'))
  const buildInitial = () => {
    if (existingPlan) {
      return {
        total_amount: String(existingPlan.total_amount),
        rows: existingLines.length ? existingLines.map((l) => ({ category_id: l.category_id, amount: String(l.amount) })) : [{ category_id: '', amount: '' }],
      }
    }
    // Nothing set for this month yet — seed from whichever month was most recently saved, as a
    // starting point. Freely editable before saving, never auto-saved as-is.
    const mostRecent = [...budgetMonths].sort((a, b) => (b.year - a.year) || (b.month - a.month))[0]
    if (mostRecent) {
      const lines = budgetMonthCategories.filter((l) => l.budget_month_id === mostRecent.id)
      return {
        total_amount: String(mostRecent.total_amount),
        rows: lines.length ? lines.map((l) => ({ category_id: l.category_id, amount: String(l.amount) })) : [{ category_id: '', amount: '' }],
      }
    }
    return { total_amount: '', rows: [{ category_id: '', amount: '' }] }
  }
  const [form, setForm] = useState(buildInitial)
  const [busy, setBusy] = useState(false)
  // Tracks which row's category dropdown (if any) is open, so a reserved spacer can appear right
  // where it's needed — a floating dropdown doesn't push layout down on its own, and without
  // this, opening one on any row but the last would silently overlap the rows below it, and on
  // the last row would overlap the Save button.
  const [openRowIndex, setOpenRowIndex] = useState(null)
  useEffect(() => { if (open) { setForm(buildInitial()); setOpenRowIndex(null) } }, [open, cursor.year, cursor.month, existingPlan?.id])
  if (!open) return null

  const setRow = (i, patch) => setForm({ ...form, rows: form.rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) })
  const addRow = () => setForm({ ...form, rows: [...form.rows, { category_id: '', amount: '' }] })
  const removeRow = (i) => setForm({ ...form, rows: form.rows.filter((_, idx) => idx !== i) })

  const total = Number(form.total_amount || 0)
  const allocated = form.rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const remaining = total - allocated
  const allocatedPct = total > 0 ? Math.round((allocated / total) * 100) : 0
  const overAllocated = remaining < 0

  const save = async (e) => {
    e.preventDefault()
    if (isClosed) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.push('Saving a budget needs a connection — try again once you’re back online.', 'error')
      return
    }
    if (overAllocated) { toast.push("You've planned more across categories than your overall budget — raise the overall total or trim a category first.", 'error'); return }
    setBusy(true)
    try {
      const rows = form.rows.filter((r) => r.category_id && Number(r.amount) >= 0)
      const response = await fetch('/api/finance/budget_months/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: cursor.year, month: cursor.month, total_amount: total, categories: rows.map((r) => ({ category_id: r.category_id, amount: Number(r.amount) })) }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
      toast.push(existingPlan ? 'Budget updated' : 'Budget set'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }

  const body = (
    <>
      <div className="flex items-center justify-center gap-3">
        <button type="button" onClick={() => shiftMonth(-1)} className="rounded-lg p-1.5 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900"><ChevronLeft size={16} /></button>
        <p className="w-36 text-center text-sm font-medium text-white light:text-slate-900">{monthLabel(cursor.year, cursor.month)}</p>
        <button type="button" onClick={() => shiftMonth(1)} className="rounded-lg p-1.5 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900"><ChevronRight size={16} /></button>
      </div>

      {isClosed && (
        <div className="mt-4 rounded-xl border border-slate-500/25 bg-slate-500/5 px-4 py-2.5 text-xs text-slate-300 light:text-slate-700">
          This month is closed — reopen it from its card in your history log before editing.
        </div>
      )}

      <fieldset disabled={isClosed} className="disabled:opacity-50">
        <label className="mt-5 block text-sm text-slate-300 light:text-slate-700">Overall monthly budget
          <input required type="number" step="0.01" min="0" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="50000" />
        </label>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-300 light:text-slate-700">Category breakdown <span className="text-xs text-slate-500">(optional)</span></div>
            <button type="button" onClick={addRow} className="flex items-center gap-1 rounded-lg bg-white/[.06] light:bg-black/[.04] px-2.5 py-1.5 text-xs font-semibold text-white light:text-slate-900 hover:bg-white/[.1] hover:light:bg-black/[.06]"><Plus size={13} />Add category</button>
          </div>

          {/* Live running total — updates on every keystroke so you can see how much of the
              overall budget is left to plan before you save, and can't accidentally allocate
              more across categories than the total actually allows. */}
          {total > 0 && (
            <div className={`mt-3 rounded-xl border px-4 py-2.5 text-xs ${overAllocated ? 'border-rose-300/30 bg-rose-300/5 text-rose-200 light:text-rose-700' : 'border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02] text-slate-300 light:text-slate-700'}`}>
              <div className="flex items-center justify-between">
                <span>{overAllocated ? `${money(-remaining)} over your overall budget` : `${money(remaining)} left to plan`}</span>
                <span className={overAllocated ? 'text-rose-300 light:text-rose-700' : 'text-slate-500'}>{money(allocated)} of {money(total)} planned · {allocatedPct}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className={`h-full rounded-full transition-all ${overAllocated ? 'bg-rose-400' : 'bg-accent-300'}`} style={{ width: `${Math.min(100, allocatedPct)}%` }} />
              </div>
              {overAllocated && <p className="mt-2 text-[11px] text-rose-300/80 light:text-rose-700">Trim a category below, or raise the overall monthly budget above — you can't save while categories add up to more than the total.</p>}
            </div>
          )}

          <div className="mt-3 space-y-2.5">
            {form.rows.map((row, i) => (
              <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <CategorySelect
                    value={row.category_id} onChange={(e) => setRow(i, { category_id: e.target.value })}
                    categories={expenseCats} onAddCategory={onAddCategory} placeholder="Choose category…"
                    open={openRowIndex === i} onOpenChange={(v) => setOpenRowIndex(v ? i : null)}
                    className="w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-2.5 text-sm text-white light:text-slate-900 outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.01" min="0" value={row.amount} onChange={(e) => setRow(i, { amount: e.target.value })} className="w-full flex-1 rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-2.5 text-sm text-white light:text-slate-900 outline-none focus:border-accent-300/50 sm:w-28 sm:flex-none" placeholder="10000" />
                  <button type="button" onClick={() => removeRow(i)} className="shrink-0 rounded-lg p-2 text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
          {/* Only rendered while a dropdown is actually open — appears exactly where it's
              needed and collapses away the instant it closes, instead of a permanent gap. */}
          {openRowIndex !== null && <div className="h-72" aria-hidden="true" />}
        </div>

        <button disabled={busy || overAllocated} className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : overAllocated ? 'Categories exceed overall budget' : existingPlan ? 'Update budget' : 'Save budget'}</button>
      </fieldset>
    </>
  )

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title={existingPlan ? 'Edit budget' : 'Set a budget'}>
        <form onSubmit={save}>{body}</form>
      </BottomSheet>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white light:text-slate-900">{existingPlan ? 'Edit budget' : 'Set a budget'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 light:text-slate-500 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-3">{body}</div>
      </form>
    </div>
  )
}
