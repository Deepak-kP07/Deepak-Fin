import { useEffect, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { DateInput, Field, FormSheet, Input } from '../../ui/FormKit'
import { Select } from '../../ui/Select'
import { tw } from '../../lib/tw'
import { api } from '../../lib/api'
import { toast } from '../../lib/toast'
import { formatDate, money, todayISO } from '../../lib/format'
import { addMonthsToDate, calcEmi, nextLoanDueDate, projectSchedule, totalInterest, upcomingEmiCovered } from '../../lib/shared'

// Ports of features/loans/LoanForm.jsx and LoanPaymentForm.jsx (the mobile BottomSheet layout).
const num = (v) => String(v ?? '').replace(/[^0-9.]/g, '')

function Toggle2({ options, value, onChange, activeClass = 'border-accent-400/30 bg-accent-400/15', activeText = 'text-accent-200 light:text-accent-700', small }) {
  return (
    <View className="flex-row gap-2">
      {options.map((o) => {
        const active = value === o.v
        return (
          <Pressable key={o.v} onPress={() => onChange(o.v)} className={tw('flex-1 items-center rounded-xl border px-3 py-2', active ? activeClass : 'border-white/10 light:border-black/10')}>
            <Text className={tw(small ? 'text-xs font-medium' : 'text-sm font-medium', active ? activeText : 'text-slate-400 light:text-slate-500')}>{o.l}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function LoanForm({ open, onClose, onSaved, editing, accounts }) {
  const blank = () => (editing
    ? { ...editing, principal: String(editing.principal ?? ''), interest_rate: String(editing.interest_rate ?? ''), tenure_months: String(editing.tenure_months ?? ''), emi_amount: String(editing.emi_amount ?? ''), outstanding: String(editing.outstanding ?? ''), emi_due_day: editing.emi_due_day ? String(editing.emi_due_day) : '', lender: editing.lender || '' }
    : { name: '', lender: '', principal: '', interest_rate: '', tenure_months: '', emi_amount: '', outstanding: '', emi_due_day: '', start_date: todayISO(), paid_from_account_id: accounts.find((a) => a.type !== 'debit_card')?.id || '', monthsAlreadyPaid: '' })
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm(blank()) }, [editing, open])
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const backfillSchedule = useMemo(() => {
    const months = Number(form.monthsAlreadyPaid)
    const P = Number(form.principal), rate = Number(form.interest_rate), emi = Number(form.emi_amount)
    if (!editing && months > 0 && P > 0 && emi > 0) return projectSchedule({ outstanding: P, annualRatePct: rate, emiAmount: emi, startDate: form.start_date }).slice(0, Math.min(60, months))
    return null
  }, [form.monthsAlreadyPaid, form.principal, form.interest_rate, form.emi_amount, form.start_date, editing])

  const suggestEmi = () => {
    const P = Number(form.principal), n = Number(form.tenure_months)
    if (P > 0 && n > 0) setForm((f) => ({ ...f, emi_amount: calcEmi(P, Number(f.interest_rate) || 0, n).toFixed(2) }))
  }
  const applyBackfillOutstanding = () => { if (backfillSchedule?.length) setForm((f) => ({ ...f, outstanding: backfillSchedule[backfillSchedule.length - 1].closing.toFixed(2) })) }

  const save = async () => {
    if (!form.name.trim() || !(Number(form.principal) >= 0) || form.principal === '' || form.interest_rate === '' || !(Number(form.tenure_months) >= 1) || form.emi_amount === '') {
      toast.push('Fill in name, principal, interest rate, tenure and EMI.', 'error'); return
    }
    setBusy(true)
    try {
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
      const saved = await api(editing ? `/finance/loans/${editing.id}` : '/finance/loans', { method: editing ? 'PATCH' : 'POST', body: payload })
      if (!editing && monthsAlreadyPaid > 0) {
        toast.push(`Backfilling ${monthsAlreadyPaid} past EMI${monthsAlreadyPaid === 1 ? '' : 's'}…`)
        for (let i = 1; i <= monthsAlreadyPaid; i++) {
          await api('/finance/loan_payments', { method: 'POST', body: { loan_id: saved.id, amount: payload.emi_amount, type: 'emi', payment_date: addMonthsToDate(payload.start_date, i), account_id: payload.paid_from_account_id || undefined } }).catch(() => null)
        }
        toast.push('Backfill complete')
      }
      toast.push(editing ? 'Loan updated' : 'Loan added')
      onSaved()
    } catch (e) { toast.push(e.message, 'error') } finally { setBusy(false) }
  }

  const accountOptions = [{ value: '', label: 'None' }, ...accounts.filter((a) => a.type !== 'debit_card').map((a) => ({ value: a.id, label: a.name }))]
  return (
    <FormSheet open={open} onClose={onClose} title={editing ? 'Edit loan' : 'Add loan'} onSubmit={save} busy={busy} submitLabel={busy ? 'Saving…' : editing ? 'Update loan' : 'Save loan'}>
      <Field label="Name"><Input value={form.name} onChangeText={set('name')} placeholder="Home loan" /></Field>
      <Field label="Lender"><Input value={form.lender} onChangeText={set('lender')} placeholder="HDFC Bank" /></Field>
      <Field label="Principal"><Input keyboardType="decimal-pad" value={form.principal} onChangeText={(v) => set('principal')(num(v))} /></Field>
      <Field label="Interest rate % p.a."><Input keyboardType="decimal-pad" value={form.interest_rate} onChangeText={(v) => set('interest_rate')(num(v))} /></Field>
      <Field label="Tenure (months)"><Input keyboardType="number-pad" value={form.tenure_months} onChangeText={(v) => set('tenure_months')(v.replace(/\D/g, ''))} /></Field>
      <Field label="EMI amount">
        <View className="mt-2 flex-row gap-2">
          <Input className="mt-0 flex-1" keyboardType="decimal-pad" value={form.emi_amount} onChangeText={(v) => set('emi_amount')(num(v))} />
          <Pressable onPress={suggestEmi} className={tw('justify-center rounded-xl border border-white/10 light:border-black/10 px-3')}><Text className={tw('text-xs text-accent-200 light:text-accent-700')}>Calc</Text></Pressable>
        </View>
      </Field>
      <Field label="Start date"><DateInput value={form.start_date} onChange={set('start_date')} /></Field>
      <Field label="EMI due day" hint="1–31, optional"><Input keyboardType="number-pad" value={form.emi_due_day} onChangeText={(v) => set('emi_due_day')(v.replace(/\D/g, '').slice(0, 2))} placeholder="e.g. 5" /></Field>
      <Field label="Pay from account"><View className="mt-2"><Select value={form.paid_from_account_id || ''} onChange={set('paid_from_account_id')} options={accountOptions} title="Pay from account" /></View></Field>
      <Field label="Current outstanding" hint="Defaults to principal"><Input keyboardType="decimal-pad" value={form.outstanding} onChangeText={(v) => set('outstanding')(num(v))} placeholder={form.principal || '0.00'} /></Field>

      {!editing && (
        <View className={tw('mt-1 rounded-xl border border-white/10 light:border-black/10 bg-black/20 light:bg-black/[.06] p-4')}>
          <Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Already paid EMIs before tracking this here?</Text>
          <Text className={tw('mt-2 text-xs text-slate-400 light:text-slate-500')}>Months already paid</Text>
          <Input className="mt-1 w-32 py-2" keyboardType="number-pad" value={form.monthsAlreadyPaid} onChangeText={(v) => set('monthsAlreadyPaid')(v.replace(/\D/g, '').slice(0, 2))} placeholder="0" />
          {backfillSchedule?.length > 0 && (
            <View className={tw('mt-3 rounded-lg bg-white/[.03] light:bg-black/[.02] p-3')}>
              <Text className={tw('text-xs leading-5 text-slate-400 light:text-slate-500')}>
                This will log {backfillSchedule.length} past EMI{backfillSchedule.length === 1 ? '' : 's'} of {money(Number(form.emi_amount))} each, dated monthly from {formatDate(addMonthsToDate(form.start_date, 1))} → {formatDate(addMonthsToDate(form.start_date, backfillSchedule.length))} — resulting outstanding ≈ <Text className={tw('font-medium text-white light:text-slate-900')}>{money(backfillSchedule[backfillSchedule.length - 1].closing)}</Text>.
              </Text>
              <Pressable onPress={applyBackfillOutstanding} className="mt-2 self-start rounded-lg border border-accent-300/30 px-3 py-1.5"><Text className={tw('text-xs font-medium text-accent-200 light:text-accent-700')}>Use this as current outstanding</Text></Pressable>
              <Text className="mt-1 text-[11px] text-slate-500">These EMI payments (and their linked expense transactions) are created after you save, so they'll show up in your real transaction history dated in the past.</Text>
            </View>
          )}
        </View>
      )}
    </FormSheet>
  )
}

export function LoanPaymentForm({ open, onClose, onSaved, loan, accounts, creditCards = [], payments = [] }) {
  const initial = () => ({ amount: loan?.emi_amount ? String(loan.emi_amount) : '', type: 'emi', prepay_mode: 'reduce_tenure', payment_date: todayISO(), account_id: loan?.paid_from_account_id || accounts.find((a) => a.type !== 'debit_card')?.id || '', notes: '' })
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm(initial()) }, [loan?.id, open])
  if (!loan) return null

  const currentEmiAmount = Number(loan.emi_amount || 0)
  const paymentDate = form.payment_date || todayISO()
  const covered = upcomingEmiCovered(loan, paymentDate, payments)
  const coveredDueDate = covered ? (() => { const [y, m, d] = paymentDate.split('-').map(Number); return nextLoanDueDate(loan, new Date(y, m - 1, d), []) })() : null
  const excessAmount = covered ? Number(form.amount || 0) : Math.max(0, Number(form.amount || 0) - currentEmiAmount)
  const showPrepayModeToggle = excessAmount > 0.01

  const prepayPreview = (() => {
    const amount = Number(form.amount)
    if (!(amount > 0) || excessAmount <= 0.01) return null
    const annualRatePct = Number(loan.interest_rate || 0)
    const currentOutstanding = Number(loan.outstanding || 0)
    const anchorDate = form.payment_date || todayISO()
    const nominalInterest = Math.min(currentOutstanding * (annualRatePct / 100 / 365) * 30, amount)
    const standardPrincipal = covered ? 0 : Math.max(0, Math.min(currentEmiAmount, amount) - nominalInterest)
    const standardOutstandingAfter = Math.max(0, currentOutstanding - standardPrincipal)
    const actualOutstandingAfter = Math.max(0, currentOutstanding - (amount - nominalInterest))
    const scheduleStandard = projectSchedule({ outstanding: standardOutstandingAfter, annualRatePct, emiAmount: currentEmiAmount, startDate: anchorDate })
    const newEmi = form.prepay_mode === 'reduce_emi' ? calcEmi(actualOutstandingAfter, annualRatePct, scheduleStandard.length) : currentEmiAmount
    const scheduleActual = projectSchedule({ outstanding: actualOutstandingAfter, annualRatePct, emiAmount: newEmi, startDate: anchorDate })
    const interestSaved = Math.max(0, totalInterest(scheduleStandard) - totalInterest(scheduleActual))
    return { newEmi, monthsBefore: scheduleStandard.length, monthsAfter: scheduleActual.length, interestSaved }
  })()

  const onAmount = (raw) => {
    const amount = num(raw)
    const excess = coveredDueDate ? Number(amount || 0) : Math.max(0, Number(amount || 0) - currentEmiAmount)
    setForm((f) => ({ ...f, amount, type: excess > 0.01 ? 'prepayment' : f.type }))
  }

  const save = async () => {
    if (!(Number(form.amount) > 0)) { toast.push('Enter an amount.', 'error'); return }
    if (!form.account_id) { toast.push('Choose an account to pay from.', 'error'); return }
    setBusy(true)
    try {
      const data = await api('/finance/loan_payments', { method: 'POST', body: { loan_id: loan.id, ...form, amount: Number(form.amount) } })
      toast.push(data?.interest_saved > 0 ? `Payment logged · Interest saved ${money(data.interest_saved)}` : 'Payment logged')
      onSaved()
    } catch (e) { toast.push(e.message, 'error') } finally { setBusy(false) }
  }

  const accountOptions = [
    { value: '', label: 'Choose account…' },
    ...accounts.filter((a) => a.type !== 'debit_card').map((a) => ({ value: a.id, label: a.name })),
    ...creditCards.map((c) => ({ value: `cc:${c.id}`, label: `${c.name} (card)` })),
  ]
  return (
    <FormSheet open={open} onClose={onClose} title="Log payment" onSubmit={save} busy={busy} submitLabel={busy ? 'Saving…' : 'Log payment'}>
      <Text className="-mt-1 mb-4 text-xs text-slate-500">{loan.name} · outstanding {money(loan.outstanding)}</Text>
      <View className="mb-3.5"><Toggle2 options={[{ v: 'emi', l: 'EMI' }, { v: 'prepayment', l: 'Prepayment' }]} value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))} /></View>
      <Field label="Amount">
        <Input keyboardType="decimal-pad" value={form.amount} onChangeText={onAmount} />
        {coveredDueDate ? (
          <Text className={tw('mt-1 text-[11px] text-accent-200 light:text-accent-700')}>Your {formatDate(coveredDueDate)} EMI is already paid in advance — all of this goes to prepayment.</Text>
        ) : excessAmount > 0.01 ? (
          <Text className={tw('mt-1 text-[11px] text-accent-200 light:text-accent-700')}>{money(currentEmiAmount)} covers the regular EMI — the extra {money(excessAmount)} is treated as a prepayment.</Text>
        ) : null}
      </Field>
      {showPrepayModeToggle && (
        <View className="mb-3.5">
          <Toggle2 small options={[{ v: 'reduce_tenure', l: 'Reduce tenure' }, { v: 'reduce_emi', l: 'Reduce EMI' }]} value={form.prepay_mode} onChange={(v) => setForm((f) => ({ ...f, prepay_mode: v }))}
            activeClass="border-emerald-400/30 bg-emerald-400/15" activeText="text-emerald-200 light:text-emerald-700" />
          <Text className="mt-1 text-[11px] text-slate-500">Reduce tenure keeps the EMI the same and finishes the loan sooner — it saves more interest than reducing the EMI.</Text>
          {form.prepay_mode === 'reduce_emi' && (
            <Text className={tw('mt-1 text-[11px] text-amber-300/80 light:text-amber-700')}>Most lenders default to reducing tenure, not EMI, after a prepayment — reducing the EMI usually needs an explicit request to your lender to take effect on their side. This just tracks your intent here.</Text>
          )}
          {prepayPreview && (
            <View className="mt-2 rounded-lg bg-emerald-400/5 px-3 py-2">
              <Text className={tw('text-[11px] text-emerald-200 light:text-emerald-700')}>
                {form.prepay_mode === 'reduce_emi'
                  ? `New EMI ≈ ${money(prepayPreview.newEmi)} · same ~${prepayPreview.monthsAfter} months left`
                  : `~${Math.max(0, prepayPreview.monthsBefore - prepayPreview.monthsAfter)} months cut off the loan`}
                {` · Interest saved ≈ ${money(prepayPreview.interestSaved)}`}
              </Text>
            </View>
          )}
        </View>
      )}
      <Field label="Payment date"><DateInput value={form.payment_date} onChange={(v) => setForm((f) => ({ ...f, payment_date: v }))} /></Field>
      <Field label="Pay from account"><View className="mt-2"><Select value={form.account_id} onChange={(v) => setForm((f) => ({ ...f, account_id: v }))} options={accountOptions} title="Pay from account" /></View></Field>
      <Field label="Notes"><Input value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} placeholder="Optional" /></Field>
    </FormSheet>
  )
}
