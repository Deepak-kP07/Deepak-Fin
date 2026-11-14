import { useState } from 'react'
import { Alert, Text } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Button, Field, Picker, styles as ui } from '../../../components/ui'
import { DateField, FormShell, bankAccountOptions } from '../../../components/forms'
import { useData } from '../../../state/DataProvider'
import { api } from '../../../lib/api'
import { money, todayISO } from '../../../lib/format'

// POST /finance/credit_cards/:id/pay_bill — records the expense from the bank account and lowers
// the card's outstanding, same as the web Pay bill form.
export default function PayCard() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const { data, refresh } = useData()
  const card = (data.credit_cards || []).find((c) => c.id === id)
  const outstanding = Number(card?.current_outstanding || 0)
  const [form, setForm] = useState({ amount: outstanding > 0 ? String(Math.round(outstanding * 100) / 100) : '', account_id: '', date: todayISO(), notes: '' })
  const [busy, setBusy] = useState(false)
  const set = (p) => setForm((f) => ({ ...f, ...p }))
  if (!card) return <FormShell title="Pay bill" onClose={() => router.back()}><Text style={ui.muted}>Card not found.</Text></FormShell>

  const save = async () => {
    const amount = Number(form.amount)
    if (!(amount > 0)) return Alert.alert('Enter an amount')
    if (!form.account_id) return Alert.alert('Choose the account you paid from')
    const account = data.accounts.find((a) => a.id === form.account_id)
    if (account && amount > Number(account.current_balance || 0) && data.profile?.block_insufficient_funds !== false) {
      return Alert.alert('Not enough balance', `"${account.name}" doesn't have ${money(amount)}.`)
    }
    setBusy(true)
    try {
      await api(`/finance/credit_cards/${card.id}/pay_bill`, { method: 'POST', body: { account_id: form.account_id, amount, date: form.date, notes: form.notes.trim() || null } })
      await refresh()
      router.back()
    } catch (e) { Alert.alert('Could not save', e.message) } finally { setBusy(false) }
  }

  return (
    <FormShell title="Pay bill" subtitle={`${card.name} · outstanding ${money(outstanding)}`} onClose={() => router.back()} footer={<Button label="Record payment" onPress={save} busy={busy} />}>
      <Field label="Amount" value={form.amount} onChangeText={(v) => set({ amount: v.replace(/[^0-9.]/g, '') })} keyboardType="decimal-pad" />
      <Picker label="Paid from" value={form.account_id} options={bankAccountOptions(data.accounts)} onChange={(v) => set({ account_id: v })} placeholder="Choose an account" />
      <DateField value={form.date} onChange={(v) => set({ date: v })} />
      <Field label="Notes (optional)" value={form.notes} onChangeText={(v) => set({ notes: v })} />
    </FormShell>
  )
}
