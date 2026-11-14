import { useEffect, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { ColorPicker, DateInput, Field, FormSheet, Input, Pills } from '../../ui/FormKit'
import { Select } from '../../ui/Select'
import { api } from '../../lib/api'
import { todayISO } from '../../lib/format'
import { tw } from '../../lib/tw'

// Port of features/accounts/AccountForm.jsx.
export function AccountForm({ open, onClose, onSaved, editing, accounts = [] }) {
  const initial = editing
    ? { ...editing, opening_balance: String(editing.opening_balance), linked_account_id: editing.linked_account_id || '', bank_name: editing.bank_name || '', account_number_last4: editing.account_number_last4 || '' }
    : { name: '', type: 'bank', bank_name: '', account_number_last4: '', opening_balance: '0', opening_balance_date: todayISO(), color: '#22d3ee', icon: 'landmark', is_active: true, linked_account_id: '' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(initial) }, [editing, open])
  const set = (p) => setForm((f) => ({ ...f, ...p }))
  const isDebitCard = form.type === 'debit_card'
  const isCash = form.type === 'cash'
  const bankAccounts = accounts.filter((a) => a.type === 'bank' && a.id !== editing?.id)

  const save = async () => {
    if (!form.name.trim()) return Alert.alert('Enter a name')
    if (isDebitCard && !form.linked_account_id) return Alert.alert('Choose the bank account this card draws from')
    setBusy(true)
    try {
      const payload = isDebitCard
        ? { name: form.name, type: 'debit_card', linked_account_id: form.linked_account_id, account_number_last4: form.account_number_last4 || null, opening_balance: 0 }
        : { name: form.name, type: form.type, bank_name: form.bank_name || null, account_number_last4: form.account_number_last4 || null, opening_balance: Number(form.opening_balance || 0), opening_balance_date: form.opening_balance_date, color: form.color, icon: form.icon, is_active: form.is_active !== false, linked_account_id: null }
      await api(editing ? `/finance/accounts/${editing.id}` : '/finance/accounts', { method: editing ? 'PATCH' : 'POST', body: payload })
      onSaved()
    } catch (e) { Alert.alert('Could not save', e.message) } finally { setBusy(false) }
  }

  return (
    <FormSheet open={open} onClose={onClose} title={editing ? 'Edit account' : 'Add account'} submitLabel={busy ? 'Saving…' : editing ? 'Update account' : 'Save account'} onSubmit={save} busy={busy}>
      <Field label="Type"><Pills value={form.type} onChange={(v) => set({ type: v })} options={[{ value: 'bank', label: 'Bank' }, { value: 'cash', label: 'Cash' }, { value: 'debit_card', label: 'Debit card' }]} /></Field>
      <Field label="Name"><Input value={form.name} onChangeText={(v) => set({ name: v })} placeholder={isDebitCard ? 'HDFC Visa Debit' : isCash ? 'Cash in hand' : 'HDFC Salary'} /></Field>
      {isDebitCard ? (
        <>
          <Field label="Linked bank account" hint="This card draws from that account's balance — it has none of its own. It'll show up merged into that account instead of as its own tile.">
            <View className="mt-2"><Select value={form.linked_account_id} onChange={(v) => set({ linked_account_id: v })} placeholder="Choose account…" options={bankAccounts.map((a) => ({ value: a.id, label: a.name }))} title="Linked bank account" /></View>
            {bankAccounts.length === 0 && <Text className={tw('mt-1 text-[11px] text-amber-300 light:text-amber-700')}>Add a bank account first.</Text>}
          </Field>
          <Field label="Card's last 4 digits" optional><Input maxLength={4} keyboardType="number-pad" value={form.account_number_last4} onChangeText={(v) => set({ account_number_last4: v })} placeholder="1234" /></Field>
        </>
      ) : (
        <>
          {!isCash && (
            <View className="flex-row gap-3">
              <Field label="Bank name" style={{ flex: 1 }}><Input value={form.bank_name} onChangeText={(v) => set({ bank_name: v })} placeholder="HDFC Bank" /></Field>
              <Field label="Last 4 digits" style={{ flex: 1 }}><Input maxLength={4} keyboardType="number-pad" value={form.account_number_last4} onChangeText={(v) => set({ account_number_last4: v })} placeholder="1234" /></Field>
            </View>
          )}
          <View className="flex-row gap-3">
            <Field label="Opening balance" style={{ flex: 1 }}><Input keyboardType="decimal-pad" value={form.opening_balance} onChangeText={(v) => set({ opening_balance: v })} /></Field>
            <Field label="As of" style={{ flex: 1 }}><DateInput value={form.opening_balance_date} onChange={(v) => set({ opening_balance_date: v })} /></Field>
          </View>
          <Text className="mb-3.5 text-[11px] text-slate-500">This is your real balance on that date. Transactions dated before it are only for your own records — they won't change this account's balance. Anything on or after it does.</Text>
          <Field label="Colour"><ColorPicker value={form.color} onChange={(c) => set({ color: c })} /></Field>
        </>
      )}
    </FormSheet>
  )
}
