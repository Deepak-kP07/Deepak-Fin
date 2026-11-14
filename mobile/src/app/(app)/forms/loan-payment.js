import { useState } from 'react'
import { Alert, Text } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Button, Field, Picker, Segmented, styles as ui } from '../../../components/ui'
import { DateField, FormShell, bankAccountOptions } from '../../../components/forms'
import { useData } from '../../../state/DataProvider'
import { api } from '../../../lib/api'
import { dayLabel, money, todayISO } from '../../../lib/format'
import { nextLoanDueDate, upcomingEmiCovered } from '../../../lib/shared'

// POST /finance/loan_payments — the server does the interest/principal split, prepayment handling
// and interest-saved maths (same endpoint as the web Log payment form).
export default function LoanPayment() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const { data, refresh } = useData()
  const loan = (data.loans || []).find((l) => l.id === id)
  const payments = (data.loan_payments || []).filter((p) => p.loan_id === id)
  const emi = Number(loan?.emi_amount || 0)
  const [form, setForm] = useState({ amount: emi ? String(emi) : '', type: 'emi', prepay_mode: 'reduce_tenure', payment_date: todayISO(), account_id: loan?.paid_from_account_id || '', notes: '' })
  const [busy, setBusy] = useState(false)
  const set = (p) => setForm((f) => ({ ...f, ...p }))
  if (!loan) return <FormShell title="Log payment" onClose={() => router.back()}><Text style={ui.muted}>Loan not found.</Text></FormShell>

  // Same rules the web form shows: if the next EMI is already paid in advance, all of this is
  // prepayment; otherwise anything above the EMI is prepayment.
  const covered = upcomingEmiCovered(loan, form.payment_date, payments)
  const amount = Number(form.amount || 0)
  const excess = covered ? amount : Math.max(0, amount - emi)
  const isPrepay = form.type === 'prepayment' || excess > 0.01

  const save = async () => {
    if (!(amount > 0)) return Alert.alert('Enter an amount')
    if (!form.account_id) return Alert.alert('Choose the account you paid from')
    setBusy(true)
    try {
      await api('/finance/loan_payments', { method: 'POST', body: { loan_id: loan.id, ...form, type: excess > 0.01 ? 'prepayment' : form.type, amount } })
      await refresh()
      router.back()
    } catch (e) { Alert.alert('Could not save', e.message) } finally { setBusy(false) }
  }

  const coveredDue = covered ? (() => { const [y, m, d] = form.payment_date.split('-').map(Number); return nextLoanDueDate(loan, new Date(y, m - 1, d), []) })() : null
  return (
    <FormShell title="Log payment" subtitle={`${loan.name} · EMI ${money(emi)}`} onClose={() => router.back()} footer={<Button label="Save payment" onPress={save} busy={busy} />}>
      <Segmented options={[{ value: 'emi', label: 'EMI' }, { value: 'prepayment', label: 'Prepayment' }]} value={form.type} onChange={(v) => set({ type: v })} />
      <Field label="Amount" value={form.amount} onChangeText={(v) => set({ amount: v.replace(/[^0-9.]/g, '') })} keyboardType="decimal-pad" />
      {coveredDue ? <Text style={[ui.muted, { marginTop: -6, marginBottom: 12 }]}>Your {dayLabel(coveredDue)} EMI is already paid in advance — all of this goes to prepayment.</Text>
        : excess > 0.01 ? <Text style={[ui.muted, { marginTop: -6, marginBottom: 12 }]}>{money(emi)} covers the EMI — the extra {money(excess)} is a prepayment.</Text> : null}
      {isPrepay && <Segmented options={[{ value: 'reduce_tenure', label: 'Reduce tenure' }, { value: 'reduce_emi', label: 'Reduce EMI' }]} value={form.prepay_mode} onChange={(v) => set({ prepay_mode: v })} />}
      <DateField value={form.payment_date} onChange={(v) => set({ payment_date: v })} />
      <Picker label="Paid from" value={form.account_id} options={bankAccountOptions(data.accounts)} onChange={(v) => set({ account_id: v })} placeholder="Choose an account" />
      <Field label="Notes (optional)" value={form.notes} onChangeText={(v) => set({ notes: v })} />
    </FormShell>
  )
}
