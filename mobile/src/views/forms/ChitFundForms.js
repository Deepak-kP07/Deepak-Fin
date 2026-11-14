import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { DateInput, Field, FormSheet, Input } from '../../ui/FormKit'
import { Select } from '../../ui/Select'
import { tw } from '../../lib/tw'
import { api } from '../../lib/api'
import { toast } from '../../lib/toast'
import { todayISO } from '../../lib/format'

// Ports of features/chit-funds/ChitFundForm.jsx, ChitFundPaymentForm.jsx, ChitFundPayoutForm.jsx.
const num = (v) => String(v ?? '').replace(/[^0-9.]/g, '')
const accountOptions = (accounts, none) => [{ value: '', label: none }, ...accounts.filter((a) => a.type !== 'debit_card').map((a) => ({ value: a.id, label: a.name }))]

export function ChitFundForm({ open, onClose, onSaved, editing, accounts }) {
  const blank = () => (editing
    ? { name: editing.name || '', duration_months: String(editing.duration_months ?? ''), monthly_contribution: String(editing.monthly_contribution ?? ''), start_date: editing.start_date, account_id: editing.account_id || '', notes: editing.notes || '' }
    : { name: '', duration_months: '', monthly_contribution: '', start_date: todayISO(), account_id: '', notes: '' })
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm(blank()) }, [editing, open])
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name.trim() || !(Number(form.duration_months) >= 1) || form.monthly_contribution === '') { toast.push('Fill in the name, duration and monthly contribution.', 'error'); return }
    setBusy(true)
    try {
      const payload = { name: form.name, duration_months: Number(form.duration_months), monthly_contribution: Number(form.monthly_contribution), start_date: form.start_date, account_id: form.account_id || null, notes: form.notes || null }
      await api(editing ? `/finance/chit_funds/${editing.id}` : '/finance/chit_funds', { method: editing ? 'PATCH' : 'POST', body: payload })
      toast.push(editing ? 'Chit fund updated' : 'Chit fund added')
      onSaved()
    } catch (e) { toast.push(e.message, 'error') } finally { setBusy(false) }
  }

  return (
    <FormSheet open={open} onClose={onClose} title={editing ? 'Edit chit fund' : 'Add chit fund'} onSubmit={save} busy={busy} submitLabel={busy ? 'Saving…' : editing ? 'Update chit fund' : 'Save chit fund'}>
      <Field label="Name"><Input value={form.name} onChangeText={set('name')} placeholder="e.g. Office chit, 10 months" /></Field>
      <Field label="Duration (months)"><Input keyboardType="number-pad" value={form.duration_months} onChangeText={(v) => set('duration_months')(v.replace(/\D/g, ''))} placeholder="10" /></Field>
      <Field label="Monthly contribution"><Input keyboardType="decimal-pad" value={form.monthly_contribution} onChangeText={(v) => set('monthly_contribution')(num(v))} placeholder="0.00" /></Field>
      <Field label="Start date"><DateInput value={form.start_date} onChange={set('start_date')} /></Field>
      <Field label="Default account" optional><View className="mt-2"><Select value={form.account_id} onChange={set('account_id')} options={accountOptions(accounts, 'None')} title="Default account" /></View></Field>
      <Field label="Notes"><Input value={form.notes} onChangeText={set('notes')} placeholder="Optional context" /></Field>
    </FormSheet>
  )
}

export function ChitFundPaymentForm({ open, onClose, onSaved, fund, editing, accounts }) {
  const blank = () => (editing
    ? { amount: String(editing.amount), dividend_received: editing.dividend_received ? String(editing.dividend_received) : '', date: editing.payment_date, account_id: editing.account_id || '', notes: editing.notes || '' }
    : { amount: fund?.monthly_contribution ? String(fund.monthly_contribution) : '', dividend_received: '', date: todayISO(), account_id: fund?.account_id || '', notes: '' })
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm(blank()) }, [fund?.id, editing, open])
  if (!fund) return null
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!(Number(form.amount) > 0)) { toast.push('Enter an amount.', 'error'); return }
    setBusy(true)
    try {
      const dividend = form.dividend_received ? Number(form.dividend_received) : 0
      if (editing) await api(`/finance/chit_fund_payments/${editing.id}`, { method: 'PATCH', body: { amount: Number(form.amount), dividend_received: dividend, payment_date: form.date, notes: form.notes || null } })
      else await api(`/finance/chit_funds/${fund.id}/log_payment`, { method: 'POST', body: { amount: Number(form.amount), dividend_received: dividend, date: form.date, account_id: form.account_id || null, notes: form.notes || null } })
      toast.push(editing ? 'Payment updated' : 'Payment logged')
      onSaved()
    } catch (e) { toast.push(e.message, 'error') } finally { setBusy(false) }
  }

  const account = accounts.find((a) => a.id === (editing ? editing.account_id : form.account_id))
  return (
    <FormSheet open={open} onClose={onClose} title={`${editing ? 'Edit payment' : 'Log payment'} · ${fund.name}`} onSubmit={save} busy={busy} submitLabel={busy ? 'Saving…' : 'Save'}>
      <Field label="Amount"><Input autoFocus keyboardType="decimal-pad" value={form.amount} onChangeText={(v) => set('amount')(num(v))} placeholder="0.00" /></Field>
      <Field label="Dividend received" optional><Input keyboardType="decimal-pad" value={form.dividend_received} onChangeText={(v) => set('dividend_received')(num(v))} placeholder="0.00" /></Field>
      <Field label="Date"><DateInput value={form.date} onChange={set('date')} /></Field>
      <Field label="Account">
        {editing ? (
          <View className={tw('mt-2 rounded-xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.015] px-3 py-3')}><Text className={tw('text-slate-400 light:text-slate-500')}>{account?.name || 'None — no account impact'}</Text></View>
        ) : (
          <View className="mt-2"><Select value={form.account_id} onChange={set('account_id')} options={accountOptions(accounts, 'None — skip account impact')} title="Account" /></View>
        )}
      </Field>
      <Field label="Notes"><Input value={form.notes} onChangeText={set('notes')} /></Field>
    </FormSheet>
  )
}

export function ChitFundPayoutForm({ open, onClose, onSaved, fund, accounts }) {
  const blank = () => ({ payout_amount: fund ? String(Number(fund.duration_months) * Number(fund.monthly_contribution)) : '', payout_date: todayISO(), payout_account_id: fund?.account_id || '', notes: '' })
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm(blank()) }, [fund?.id, open])
  if (!fund) return null
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!(Number(form.payout_amount) > 0)) { toast.push('Enter the amount received.', 'error'); return }
    setBusy(true)
    try {
      await api(`/finance/chit_funds/${fund.id}/take_payout`, { method: 'POST', body: { payout_amount: Number(form.payout_amount), payout_date: form.payout_date, payout_account_id: form.payout_account_id || null, notes: form.notes || null } })
      toast.push('Payout recorded')
      onSaved()
    } catch (e) { toast.push(e.message, 'error') } finally { setBusy(false) }
  }

  return (
    <FormSheet open={open} onClose={onClose} title={`Take payout · ${fund.name}`} onSubmit={save} busy={busy} submitLabel={busy ? 'Saving…' : 'Save'}>
      <Field label="Amount received"><Input autoFocus keyboardType="decimal-pad" value={form.payout_amount} onChangeText={(v) => set('payout_amount')(num(v))} placeholder="0.00" /></Field>
      <Field label="Date"><DateInput value={form.payout_date} onChange={set('payout_date')} /></Field>
      <Field label="Credited to"><View className="mt-2"><Select value={form.payout_account_id} onChange={set('payout_account_id')} options={accountOptions(accounts, 'None — skip account impact')} title="Credited to" /></View></Field>
      <Field label="Notes"><Input value={form.notes} onChangeText={set('notes')} /></Field>
    </FormSheet>
  )
}
