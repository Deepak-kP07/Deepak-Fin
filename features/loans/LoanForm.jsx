'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { calcEmi, projectSchedule } from '@/lib/amortization'
import { addMonthsToDate, formatDate, money, todayISO } from '@/lib/format'
import { Select } from '@/components/shared/Select'
import { DateInput } from '@/components/shared/DateInput'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useIsMobile } from '@/hooks/use-mobile'

function LoanFormFields({ form, setForm, accounts, editing, backfillSchedule, suggestEmi, applyBackfillOutstanding }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-slate-300 light:text-slate-700">Name
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="Home loan" />
        </label>
        <label className="text-sm text-slate-300 light:text-slate-700">Lender
          <input value={form.lender || ''} onChange={(e) => setForm({ ...form, lender: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="HDFC Bank" />
        </label>
        <label className="text-sm text-slate-300 light:text-slate-700">Principal
          <input required type="number" step="0.01" min="0" value={form.principal} onChange={(e) => setForm({ ...form, principal: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
        </label>
        <label className="text-sm text-slate-300 light:text-slate-700">Interest rate % p.a.
          <input required type="number" step="0.01" min="0" value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
        </label>
        <label className="text-sm text-slate-300 light:text-slate-700">Tenure (months)
          <input required type="number" min="1" value={form.tenure_months} onChange={(e) => setForm({ ...form, tenure_months: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
        </label>
        <label className="text-sm text-slate-300 light:text-slate-700">EMI amount
          <div className="mt-2 flex gap-2">
            <input required type="number" step="0.01" min="0" value={form.emi_amount} onChange={(e) => setForm({ ...form, emi_amount: e.target.value })} className="w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
            <button type="button" onClick={suggestEmi} className="rounded-xl border border-white/10 light:border-black/10 px-3 text-xs text-accent-200 light:text-accent-700 hover:bg-white/5">Calc</button>
          </div>
        </label>
        <label className="text-sm text-slate-300 light:text-slate-700">Start date
          <DateInput value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
        </label>
        <label className="text-sm text-slate-300 light:text-slate-700">EMI due day <span className="text-xs text-slate-500">(1–31, optional)</span>
          <input type="number" min="1" max="31" value={form.emi_due_day} onChange={(e) => setForm({ ...form, emi_due_day: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="e.g. 5" />
        </label>
        <label className="text-sm text-slate-300 light:text-slate-700">Pay from account
          <Select value={form.paid_from_account_id || ''} onChange={(e) => setForm({ ...form, paid_from_account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none">
            <option value="">None</option>
            {accounts.filter((a) => a.type !== 'debit_card').map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </label>
        <label className="text-sm text-slate-300 light:text-slate-700">Current outstanding <span className="text-xs text-slate-500">(defaults to principal)</span>
          <input type="number" step="0.01" min="0" value={form.outstanding} onChange={(e) => setForm({ ...form, outstanding: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder={form.principal || '0.00'} />
        </label>
      </div>

      {!editing && (
        <div className="mt-4 rounded-xl border border-white/10 light:border-black/10 bg-black/20 light:bg-black/[.06] p-4">
          <div className="text-sm text-slate-300 light:text-slate-700">Already paid EMIs before tracking this here?</div>
          <label className="mt-2 block text-xs text-slate-400 light:text-slate-500">Months already paid
            <input type="number" min="0" max="60" value={form.monthsAlreadyPaid} onChange={(e) => setForm({ ...form, monthsAlreadyPaid: e.target.value })} className="mt-1 w-32 rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-2 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="0" />
          </label>
          {backfillSchedule?.length > 0 && (
            <div className="mt-3 rounded-lg bg-white/[.03] light:bg-black/[.02] p-3 text-xs text-slate-400 light:text-slate-500">
              <div>This will log {backfillSchedule.length} past EMI{backfillSchedule.length === 1 ? '' : 's'} of {money(Number(form.emi_amount))} each, dated monthly from {formatDate(addMonthsToDate(form.start_date, 1))} → {formatDate(addMonthsToDate(form.start_date, backfillSchedule.length))} — resulting outstanding ≈ <span className="font-medium text-white light:text-slate-900">{money(backfillSchedule[backfillSchedule.length - 1].closing)}</span>.</div>
              <button type="button" onClick={applyBackfillOutstanding} className="mt-2 rounded-lg border border-accent-300/30 px-3 py-1.5 text-xs font-medium text-accent-200 light:text-accent-700 hover:bg-accent-300/10">Use this as current outstanding</button>
              <div className="mt-1 text-[11px] text-slate-500">These EMI payments (and their linked expense transactions) are created after you save, so they'll show up in your real transaction history dated in the past.</div>
            </div>
          )}
        </div>
      )}
    </>
  )
}

// Entirely online-only, not just its create path — save() can chain up to 60 sequential
// /loan_payments POSTs (an opening-balance backfill) after the loan itself saves, so there's no
// safe way to split "the loan row is plain CRUD" from "this specific save might also cascade
// side-effecting work." No mutate() here, matching Transactions' repayment path.
export function LoanForm({ open, onClose, onSaved, editing, accounts, toast }) {
  const initial = editing
    ? { ...editing, principal: String(editing.principal), interest_rate: String(editing.interest_rate), tenure_months: String(editing.tenure_months), emi_amount: String(editing.emi_amount), outstanding: String(editing.outstanding), emi_due_day: editing.emi_due_day ? String(editing.emi_due_day) : '' }
    : { name: '', lender: '', principal: '', interest_rate: '', tenure_months: '', emi_amount: '', outstanding: '', emi_due_day: '', start_date: todayISO(), paid_from_account_id: accounts[0]?.id || '', monthsAlreadyPaid: '' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const isMobile = useIsMobile()
  useEffect(() => { setForm(initial) }, [editing, open])

  // Hooks must run unconditionally on every render, so this stays above the `!open` early
  // return below — otherwise the hook order shifts between the closed and open renders.
  const backfillSchedule = useMemo(() => {
    const months = Number(form.monthsAlreadyPaid)
    const P = Number(form.principal), rate = Number(form.interest_rate), emi = Number(form.emi_amount)
    if (!editing && months > 0 && P > 0 && emi > 0) {
      return projectSchedule({ outstanding: P, annualRatePct: rate, emiAmount: emi, startDate: form.start_date }).slice(0, Math.min(60, months))
    }
    return null
  }, [form.monthsAlreadyPaid, form.principal, form.interest_rate, form.emi_amount, editing])

  if (!open) return null

  // Auto-calc EMI if principal/rate/tenure known and emi is empty
  const suggestEmi = () => {
    const P = Number(form.principal), n = Number(form.tenure_months)
    if (P > 0 && n > 0) setForm({ ...form, emi_amount: calcEmi(P, Number(form.interest_rate) || 0, n).toFixed(2) })
  }

  const applyBackfillOutstanding = () => {
    if (backfillSchedule?.length) setForm({ ...form, outstanding: backfillSchedule[backfillSchedule.length - 1].closing.toFixed(2) })
  }

  const save = async (e) => {
    e.preventDefault()
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.push('Loans need a connection — try again once you’re back online.', 'error')
      return
    }
    setBusy(true)
    try {
      const endpoint = editing ? `/api/finance/loans/${editing.id}` : '/api/finance/loans'
      const payload = {
        ...form,
        principal: Number(form.principal), interest_rate: Number(form.interest_rate), tenure_months: Number(form.tenure_months),
        emi_amount: Number(form.emi_amount),
        outstanding: form.outstanding !== '' ? Number(form.outstanding) : Number(form.principal),
        emi_due_day: form.emi_due_day ? Number(form.emi_due_day) : null,
        paid_from_account_id: form.paid_from_account_id || null,
      }
      const monthsAlreadyPaid = Math.min(60, Math.max(0, Math.floor(Number(form.monthsAlreadyPaid) || 0)))
      delete payload.monthsAlreadyPaid
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')

      if (!editing && monthsAlreadyPaid > 0) {
        toast.push(`Backfilling ${monthsAlreadyPaid} past EMI${monthsAlreadyPaid === 1 ? '' : 's'}…`)
        for (let i = 1; i <= monthsAlreadyPaid; i++) {
          await fetch('/api/finance/loan_payments', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loan_id: data.id, amount: payload.emi_amount, type: 'emi', payment_date: addMonthsToDate(payload.start_date, i), account_id: payload.paid_from_account_id || undefined }),
          })
        }
        toast.push('Backfill complete')
      }

      toast.push(editing ? 'Loan updated' : 'Loan added'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }

  const fieldsProps = { form, setForm, accounts, editing, backfillSchedule, suggestEmi, applyBackfillOutstanding }
  const submitButton = <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update loan' : 'Save loan'}</button>

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title={editing ? 'Edit loan' : 'Add loan'}>
        <form onSubmit={save}>
          <LoanFormFields {...fieldsProps} />
          {submitButton}
        </form>
      </BottomSheet>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white light:text-slate-900">{editing ? 'Edit loan' : 'Add loan'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 light:text-slate-500 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5">
          <LoanFormFields {...fieldsProps} />
        </div>
        {submitButton}
      </form>
    </div>
  )
}
