import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { DateInput, Field, FormSheet, Input } from '../../ui/FormKit'
import { Select } from '../../ui/Select'
import { tw } from '../../lib/tw'
import { api } from '../../lib/api'
import { toast } from '../../lib/toast'
import { todayISO } from '../../lib/format'

// Ports of features/lend-borrow/LendForm.jsx and LendAddMoreForm.jsx.
const num = (v) => String(v ?? '').replace(/[^0-9.]/g, '')
const accountOptions = (accounts, creditCards, withCards) => [
  { value: '', label: 'None (skip account impact)' },
  ...accounts.filter((a) => a.type !== 'debit_card').map((a) => ({ value: a.id, label: a.name })),
  ...(withCards ? creditCards.map((c) => ({ value: `cc:${c.id}`, label: `${c.name} (card)` })) : []),
]

export function LendForm({ open, onClose, onSaved, editing, accounts, creditCards = [] }) {
  const blank = () => (editing
    ? { ...editing, amount: String(editing.amount ?? ''), due_date: editing.due_date || '', reason: editing.reason || '', notes: editing.notes || '', from_account_id: editing.from_account_id || '' }
    : { person_name: '', type: 'lent', amount: '', date: todayISO(), due_date: '', from_account_id: accounts.find((a) => a.type !== 'debit_card')?.id || '', reason: '', notes: '' })
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm(blank()) }, [editing, open])
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.person_name.trim()) { toast.push('Enter the person’s name.', 'error'); return }
    if (!(Number(form.amount) > 0)) { toast.push('Enter an amount.', 'error'); return }
    setBusy(true)
    try {
      const payload = { ...form, amount: Number(form.amount), due_date: form.due_date || null }
      // Server-computed / joined fields must not be sent back on an edit.
      delete payload.my_role; delete payload.linked_account
      await api(editing ? `/finance/lend_borrow/${editing.id}` : '/finance/lend_borrow', { method: editing ? 'PATCH' : 'POST', body: payload })
      toast.push(editing ? 'Updated' : 'Recorded')
      onSaved()
    } catch (e) { toast.push(e.message, 'error') } finally { setBusy(false) }
  }

  return (
    <FormSheet open={open} onClose={onClose} title={editing ? 'Edit record' : 'Log lend or borrow'} onSubmit={save} busy={busy} submitLabel={busy ? 'Saving…' : editing ? 'Update' : 'Save'}>
      <View className="mb-5 flex-row gap-2">
        {[{ v: 'lent', l: 'I lent' }, { v: 'borrowed', l: 'I borrowed' }].map((t) => {
          const active = form.type === t.v
          return (
            <Pressable key={t.v} onPress={() => setForm((f) => ({ ...f, type: t.v, from_account_id: t.v === 'borrowed' && String(f.from_account_id || '').startsWith('cc:') ? '' : f.from_account_id }))}
              className={tw('flex-1 items-center rounded-xl border px-3 py-2', active ? 'border-accent-400/30 bg-accent-400/15' : 'border-white/10 light:border-black/10')}>
              <Text className={tw('text-sm font-medium', active ? 'text-accent-200 light:text-accent-700' : 'text-slate-400 light:text-slate-500')}>{t.l}</Text>
            </Pressable>
          )
        })}
      </View>
      <Field label="Person name"><Input value={form.person_name} onChangeText={set('person_name')} placeholder="Rohan" /></Field>
      <Field label="Amount"><Input keyboardType="decimal-pad" value={form.amount} onChangeText={(v) => set('amount')(num(v))} /></Field>
      <Field label="Date"><DateInput value={form.date} onChange={set('date')} /></Field>
      <Field label={form.type === 'lent' ? 'From account' : 'To account'}><View className="mt-2"><Select value={form.from_account_id || ''} onChange={set('from_account_id')} options={accountOptions(accounts, creditCards, form.type === 'lent')} title={form.type === 'lent' ? 'From account' : 'To account'} /></View></Field>
      <Field label="Due date (optional)"><DateInput value={form.due_date || ''} onChange={set('due_date')} placeholder="No due date" /></Field>
      {form.due_date ? <Pressable onPress={() => set('due_date')('')} className="-mt-2 mb-3 self-start"><Text className={tw('text-xs text-accent-200 light:text-accent-700')}>Clear due date</Text></Pressable> : null}
      <Field label="Reason"><Input value={form.reason || ''} onChangeText={set('reason')} placeholder="Rent help, exam fees…" /></Field>
      <Field label="Notes"><Input value={form.notes || ''} onChangeText={set('notes')} /></Field>
    </FormSheet>
  )
}

export function LendAddMoreForm({ open, onClose, onSaved, record, accounts, creditCards = [] }) {
  const EMPTY = () => ({ amount: '', date: todayISO(), account_id: '', notes: '' })
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm(EMPTY()) }, [record?.id, open])
  if (!record) return null
  const isLent = record.type === 'lent'
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!(Number(form.amount) > 0)) { toast.push('Enter an amount.', 'error'); return }
    setBusy(true)
    try {
      await api(`/finance/lend_borrow/${record.id}/add_more`, { method: 'POST', body: { amount: Number(form.amount), date: form.date, account_id: form.account_id || null, notes: form.notes || null } })
      toast.push(isLent ? 'Logged more lent' : 'Logged more borrowed')
      onSaved()
    } catch (e) { toast.push(e.message, 'error') } finally { setBusy(false) }
  }

  return (
    <FormSheet open={open} onClose={onClose} title={`Log ${isLent ? 'more lent to' : 'more borrowed from'} ${record.person_name}`} onSubmit={save} busy={busy} submitLabel={busy ? 'Saving…' : 'Save'}>
      <Field label="Amount"><Input autoFocus keyboardType="decimal-pad" value={form.amount} onChangeText={(v) => set('amount')(num(v))} placeholder="0.00" /></Field>
      <Field label="Date"><DateInput value={form.date} onChange={set('date')} /></Field>
      <Field label={isLent ? 'From account' : 'To account'}><View className="mt-2"><Select value={form.account_id} onChange={set('account_id')} options={accountOptions(accounts, creditCards, isLent)} title={isLent ? 'From account' : 'To account'} /></View></Field>
      <Field label="Notes"><Input value={form.notes} onChangeText={set('notes')} /></Field>
    </FormSheet>
  )
}
