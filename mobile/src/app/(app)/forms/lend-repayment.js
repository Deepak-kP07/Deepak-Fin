import { useState } from 'react'
import { Alert, Text } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Button, Field, Picker, styles as ui } from '../../../components/ui'
import { DateField, FormShell, bankAccountOptions } from '../../../components/forms'
import { useData } from '../../../state/DataProvider'
import { api } from '../../../lib/api'
import { money, nowTime, todayISO } from '../../../lib/format'
import { pendingOf } from '../../../lib/modules'

// A repayment is a normal transaction linked to the record (linked_module 'lend') — the server
// records it against the record and updates its status, exactly like the web "Log repayment".
export default function LendRepayment() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const { data, refresh } = useData()
  const record = (data.lend_borrow || []).find((r) => r.id === id)
  const pending = record ? pendingOf(record) : 0
  const [form, setForm] = useState({ amount: pending ? String(pending) : '', account_id: '', date: todayISO(), notes: '' })
  const [busy, setBusy] = useState(false)
  const set = (p) => setForm((f) => ({ ...f, ...p }))
  if (!record) return <FormShell title="Repayment" onClose={() => router.back()}><Text style={ui.muted}>Record not found.</Text></FormShell>
  const lent = record.type === 'lent'

  const save = async () => {
    const amount = Number(form.amount)
    if (!(amount > 0)) return Alert.alert('Enter an amount')
    if (!form.account_id) return Alert.alert(lent ? 'Choose where you received it' : 'Choose where you paid from')
    if (amount > pending + 0.01) return Alert.alert('More than what’s pending', `Only ${money(pending)} is pending on this record.`)
    setBusy(true)
    try {
      await api('/finance/transactions', { method: 'POST', body: {
        type: lent ? 'income' : 'expense', amount, account_id: form.account_id, date: form.date, time: nowTime(),
        description: lent ? `Repayment from ${record.person_name}` : `Repayment to ${record.person_name}`,
        notes: form.notes.trim() || null, linked_module: 'lend', linked_module_id: record.id, status: 'confirmed',
      } })
      await refresh()
      router.back()
    } catch (e) { Alert.alert('Could not save', e.message) } finally { setBusy(false) }
  }

  return (
    <FormShell title={lent ? 'Money received' : 'Repayment'} subtitle={`${record.person_name} · ${money(pending)} pending`} onClose={() => router.back()} footer={<Button label="Save" onPress={save} busy={busy} />}>
      <Field label="Amount" value={form.amount} onChangeText={(v) => set({ amount: v.replace(/[^0-9.]/g, '') })} keyboardType="decimal-pad" />
      <Picker label={lent ? 'Received in' : 'Paid from'} value={form.account_id} options={bankAccountOptions(data.accounts)} onChange={(v) => set({ account_id: v })} placeholder="Choose an account" />
      <DateField value={form.date} onChange={(v) => set({ date: v })} />
      <Field label="Notes (optional)" value={form.notes} onChangeText={(v) => set({ notes: v })} />
    </FormShell>
  )
}
