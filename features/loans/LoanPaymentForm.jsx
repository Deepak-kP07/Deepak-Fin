'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { calcEmi, projectSchedule, totalInterest } from '@/lib/amortization'
import { money, todayISO } from '@/lib/format'
import { Select } from '@/components/shared/Select'
import { DateInput } from '@/components/shared/DateInput'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useIsMobile } from '@/hooks/use-mobile'

function LoanPaymentFormFields({ form, setForm, accounts, creditCards, loan, currentEmiAmount, excessAmount, showPrepayModeToggle, prepayPreview }) {
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2">
        {[{ v: 'emi', l: 'EMI' }, { v: 'prepayment', l: 'Prepayment' }].map((t) => (
          <button key={t.v} type="button" onClick={() => setForm({ ...form, type: t.v })} className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${form.type === t.v ? 'border-accent-400/30 bg-accent-400/15 text-accent-200' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>{t.l}</button>
        ))}
      </div>
      <label className="text-sm text-slate-300">Amount
        <input required type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => {
          const amount = e.target.value
          const excess = Math.max(0, Number(amount || 0) - currentEmiAmount)
          setForm({ ...form, amount, type: excess > 0.01 ? 'prepayment' : form.type })
        }} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-accent-300/50" />
        {excessAmount > 0.01 && (
          <div className="mt-1 text-[11px] text-accent-200">{money(currentEmiAmount)} covers the regular EMI — the extra {money(excessAmount)} is treated as a prepayment.</div>
        )}
      </label>
      {showPrepayModeToggle && (
        <div>
          <div className="grid grid-cols-2 gap-2">
            {[{ v: 'reduce_tenure', l: 'Reduce tenure' }, { v: 'reduce_emi', l: 'Reduce EMI' }].map((m) => (
              <button key={m.v} type="button" onClick={() => setForm({ ...form, prepay_mode: m.v })} className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${form.prepay_mode === m.v ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-200' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>{m.l}</button>
            ))}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Reduce tenure keeps the EMI the same and finishes the loan sooner — it saves more interest than reducing the EMI.</div>
          {form.prepay_mode === 'reduce_emi' && (
            <div className="mt-1 text-[11px] text-amber-300/80">Most lenders default to reducing tenure, not EMI, after a prepayment — reducing the EMI usually needs an explicit request to your lender to take effect on their side. This just tracks your intent here.</div>
          )}
          {prepayPreview && (
            <div className="mt-2 rounded-lg bg-emerald-400/5 px-3 py-2 text-[11px] text-emerald-200">
              {form.prepay_mode === 'reduce_emi'
                ? <>New EMI ≈ {money(prepayPreview.newEmi)} · same ~{prepayPreview.monthsAfter} months left</>
                : <>~{Math.max(0, prepayPreview.monthsBefore - prepayPreview.monthsAfter)} months cut off the loan</>}
              {' · '}Interest saved ≈ {money(prepayPreview.interestSaved)}
            </div>
          )}
        </div>
      )}
      <label className="text-sm text-slate-300">Payment date
        <DateInput value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-accent-300/50" />
      </label>
      <label className="text-sm text-slate-300">Pay from account
        <Select required value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
          <option value="">Choose account…</option>
          {accounts.filter((a) => a.type !== 'debit_card').map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          {creditCards.map((c) => <option key={c.id} value={`cc:${c.id}`}>{c.name} (card)</option>)}
        </Select>
      </label>
      <label className="text-sm text-slate-300">Notes
        <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-accent-300/50" placeholder="Optional" />
      </label>
    </div>
  )
}

// A real repayment — one POST here touches loan_payments, loans (outstanding/interest_saved/
// emi_amount/status), a mirrored transactions row, and optionally a credit card's outstanding.
// Stays online-only, same rule as Transactions' own repayment path — no mutate() here.
export function LoanPaymentForm({ open, onClose, onSaved, loan, accounts, creditCards = [], toast }) {
  const initial = { amount: '', type: 'emi', prepay_mode: 'reduce_tenure', payment_date: todayISO(), account_id: loan?.paid_from_account_id || accounts[0]?.id || '', notes: '' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const isMobile = useIsMobile()
  useEffect(() => { setForm({ ...initial, amount: loan?.emi_amount ? String(loan.emi_amount) : '', account_id: loan?.paid_from_account_id || accounts[0]?.id || '' }) }, [loan, open, accounts])
  if (!open || !loan) return null

  const currentEmiAmount = Number(loan.emi_amount || 0)
  const excessAmount = Math.max(0, Number(form.amount || 0) - currentEmiAmount)
  const showPrepayModeToggle = excessAmount > 0.01

  // Live preview — mirrors the backend's unified logic: interest owed since the last payment is
  // charged first regardless of whether you picked EMI or Prepayment (the real day-count is only
  // known server-side, so this uses a nominal ~30-day estimate — a close preview, not a promise
  // of the exact figure), then only the amount beyond a standard EMI counts as genuine extra.
  const prepayPreview = (() => {
    const amount = Number(form.amount)
    if (!(amount > 0) || excessAmount <= 0.01) return null
    const annualRatePct = Number(loan.interest_rate || 0)
    const currentOutstanding = Number(loan.outstanding || 0)
    const anchorDate = form.payment_date || todayISO()
    const nominalInterest = Math.min(currentOutstanding * (annualRatePct / 100 / 365) * 30, amount)
    const standardPrincipal = Math.max(0, Math.min(currentEmiAmount, amount) - nominalInterest)
    const standardOutstandingAfter = Math.max(0, currentOutstanding - standardPrincipal)
    const actualOutstandingAfter = Math.max(0, currentOutstanding - (amount - nominalInterest))
    const scheduleStandard = projectSchedule({ outstanding: standardOutstandingAfter, annualRatePct, emiAmount: currentEmiAmount, startDate: anchorDate })
    const newEmi = form.prepay_mode === 'reduce_emi' ? calcEmi(actualOutstandingAfter, annualRatePct, scheduleStandard.length) : currentEmiAmount
    const scheduleActual = projectSchedule({ outstanding: actualOutstandingAfter, annualRatePct, emiAmount: newEmi, startDate: anchorDate })
    const interestSaved = Math.max(0, totalInterest(scheduleStandard) - totalInterest(scheduleActual))
    return { newEmi, monthsBefore: scheduleStandard.length, monthsAfter: scheduleActual.length, interestSaved }
  })()

  const save = async (e) => {
    e.preventDefault()
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.push('Logging a payment needs a connection — try again once you’re back online.', 'error')
      return
    }
    setBusy(true)
    try {
      const payload = { loan_id: loan.id, ...form, amount: Number(form.amount) }
      const response = await fetch('/api/finance/loan_payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
      const msg = data.interest_saved > 0 ? `Payment logged · Interest saved ${money(data.interest_saved)}` : 'Payment logged'
      toast.push(msg)
      onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }

  const fieldsProps = { form, setForm, accounts, creditCards, loan, currentEmiAmount, excessAmount, showPrepayModeToggle, prepayPreview }
  const submitButton = <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : 'Log payment'}</button>

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title="Log payment">
        <p className="-mt-2 mb-4 text-xs text-slate-500">{loan.name} · outstanding {money(loan.outstanding)}</p>
        <form onSubmit={save}>
          <LoanPaymentFormFields {...fieldsProps} />
          {submitButton}
        </form>
      </BottomSheet>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Log payment</h2>
            <p className="mt-1 text-xs text-slate-500">{loan.name} · outstanding {money(loan.outstanding)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5">
          <LoanPaymentFormFields {...fieldsProps} />
        </div>
        {submitButton}
      </form>
    </div>
  )
}
