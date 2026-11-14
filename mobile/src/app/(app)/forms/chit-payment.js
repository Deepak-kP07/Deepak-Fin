import { useState } from 'react'
import { Alert, Text } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Button, Field, Picker, styles as ui } from '../../../components/ui'
import { DateField, FormShell, bankAccountOptions } from '../../../components/forms'
import { useData } from '../../../state/DataProvider'
import { api } from '../../../lib/api'
import { money, todayISO } from '../../../lib/format'

const NO_ACCOUNT = '__none__'

// POST /finance/chit_funds/:id/log_payment — with an account, the server also records the expense.
export default function ChitPayment() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const { data, refresh } = useData()
  const fund = (data.chit_funds || []).find((c) => c.id === id)
  const [form, setForm] = useState({ amount: fund ? String(fund.monthly_contribution) : '', dividend_received: '', date: todayISO(), account_id: fund?.account_id || '', notes: '' })
  const [busy, setBusy] = useState(false)
  const set = (p) => setForm((f) => ({ ...f, ...p }))
  if (!fund) return <FormShell title="Log payment" onClose={() => router.back()}><Text style={ui.muted}>Chit fund not found.</Text></FormShell>

  const save = async () => {
    const amount = Number(form.amount)
    if (!(amount > 0)) return Alert.alert('Enter an amount')
    if (!form.account_id) return Alert.alert('Choose the account you paid from')
    setBusy(true)
    try {
      await api(`/finance/chit_funds/${id}/log_payment`, { method: 'POST', body: {
        amount, dividend_received: Number(form.dividend_received || 0), date: form.date,
        account_id: form.account_id === NO_ACCOUNT ? null : form.account_id, notes: form.notes.trim() || null,
      } })
      await refresh()
      router.back()
    } catch (e) { Alert.alert('Could not save', e.message) } finally { setBusy(false) }
  }

  return (
    <FormShell title="Log payment" subtitle={`${fund.name} · ${money(fund.monthly_contribution)} a month`} onClose={() => router.back()} footer={<Button label="Save payment" onPress={save} busy={busy} />}>
      <Field label="Amount paid" value={form.amount} onChangeText={(v) => set({ amount: v.replace(/[^0-9.]/g, '') })} keyboardType="decimal-pad" />
      <Field label="Dividend received (optional)" value={form.dividend_received} onChangeText={(v) => set({ dividend_received: v.replace(/[^0-9.]/g, '') })} keyboardType="decimal-pad" placeholder="0" />
      <Picker label="Paid from" value={form.account_id} options={[...bankAccountOptions(data.accounts), { value: NO_ACCOUNT, label: "Don't record a money movement" }]} onChange={(v) => set({ account_id: v })} placeholder="Choose an account" />
      <DateField value={form.date} onChange={(v) => set({ date: v })} />
      <Field label="Notes (optional)" value={form.notes} onChangeText={(v) => set({ notes: v })} />
    </FormShell>
  )
}
