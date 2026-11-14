import { useState } from 'react'
import { Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Button, Field, Picker, Segmented } from '../../../components/ui'
import { DateField, FormShell, bankAccountOptions } from '../../../components/forms'
import { useData } from '../../../state/DataProvider'
import { api } from '../../../lib/api'
import { todayISO } from '../../../lib/format'

// POST /finance/lend_borrow — with an account chosen, the server also records the money leaving
// (lent) or arriving (borrowed) as a transaction. "Don't move money" skips that.
const NO_ACCOUNT = '__none__'

export default function LendRecordForm() {
  const router = useRouter()
  const { data, refresh } = useData()
  const [form, setForm] = useState({ person_name: '', type: 'lent', amount: '', date: todayISO(), due_date: '', from_account_id: '', reason: '' })
  const [busy, setBusy] = useState(false)
  const set = (p) => setForm((f) => ({ ...f, ...p }))
  const accountOptions = [
    ...bankAccountOptions(data.accounts),
    ...(form.type === 'lent' ? (data.credit_cards || []).map((c) => ({ value: `cc:${c.id}`, label: `${c.name} (credit card)` })) : []),
    { value: NO_ACCOUNT, label: "Don't record a money movement" },
  ]

  const save = async () => {
    const amount = Number(form.amount)
    if (!form.person_name.trim()) return Alert.alert('Enter who it is')
    if (!(amount > 0)) return Alert.alert('Enter an amount')
    if (!form.from_account_id) return Alert.alert(form.type === 'lent' ? 'Choose where the money came from' : 'Choose where the money went')
    setBusy(true)
    try {
      await api('/finance/lend_borrow', { method: 'POST', body: {
        person_name: form.person_name.trim(), type: form.type, amount, date: form.date, due_date: form.due_date || null,
        from_account_id: form.from_account_id === NO_ACCOUNT ? '' : form.from_account_id, reason: form.reason.trim() || null,
      } })
      await refresh()
      router.back()
    } catch (e) { Alert.alert('Could not save', e.message) } finally { setBusy(false) }
  }

  return (
    <FormShell title="New lend / borrow" onClose={() => router.back()} footer={<Button label="Save" onPress={save} busy={busy} />}>
      <Segmented options={[{ value: 'lent', label: 'I lent' }, { value: 'borrowed', label: 'I borrowed' }]} value={form.type} onChange={(v) => set({ type: v, from_account_id: v === 'borrowed' && form.from_account_id.startsWith('cc:') ? '' : form.from_account_id })} />
      <Field label={form.type === 'lent' ? 'Lent to' : 'Borrowed from'} value={form.person_name} onChangeText={(v) => set({ person_name: v })} placeholder="Name" autoCapitalize="words" />
      <Field label="Amount" value={form.amount} onChangeText={(v) => set({ amount: v.replace(/[^0-9.]/g, '') })} keyboardType="decimal-pad" />
      <Picker label={form.type === 'lent' ? 'Paid from' : 'Received in'} value={form.from_account_id} options={accountOptions} onChange={(v) => set({ from_account_id: v })} placeholder="Choose an account" />
      <DateField value={form.date} onChange={(v) => set({ date: v })} />
      <DateField label="Due date (optional)" value={form.due_date} onChange={(v) => set({ due_date: v })} allowFuture optional />
      <Field label="Reason (optional)" value={form.reason} onChangeText={(v) => set({ reason: v })} />
    </FormShell>
  )
}
