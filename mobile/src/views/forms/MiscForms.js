import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'
import { Pencil, Plus, Trash2, Upload } from 'lucide-react-native'
import { Icon } from '../../ui/Icon'
import { BottomSheet } from '../../ui/BottomSheet'
import { AccentGradient } from '../../ui/Gradient'
import { ColorPicker, DateInput, Field, FormSheet, Input, Pills, SubmitButton } from '../../ui/FormKit'
import { Select } from '../../ui/Select'
import { tw } from '../../lib/tw'
import { api } from '../../lib/api'
import { MONTH_NAMES, capitalizeFirst, money, todayISO } from '../../lib/format'
import { parseCsv } from '@/lib/csv'

const fmtDate = (d) => { if (!d) return ''; const [y, m, dd] = String(d).slice(0, 10).split('-').map(Number); return `${String(dd).padStart(2, '0')}-${MONTH_NAMES[m - 1]?.slice(0, 3)}-${y}` }

// Port of features/credit-cards/CreditCardForm.jsx.
export function CreditCardForm({ open, onClose, onSaved, editing }) {
  const initial = editing
    ? { ...editing, bank: editing.bank || '', last4: editing.last4 || '', credit_limit: String(editing.credit_limit), billing_date: String(editing.billing_date), due_date_offset: String(editing.due_date_offset), color: editing.color || '#a78bfa' }
    : { name: '', bank: '', last4: '', credit_limit: '', billing_date: '1', due_date_offset: '15', color: '#a78bfa' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(initial) }, [editing, open])
  const set = (p) => setForm((f) => ({ ...f, ...p }))
  const save = async () => {
    if (!form.name.trim() || !form.credit_limit) return Alert.alert('Enter the card name and credit limit')
    const bd = Number(form.billing_date), off = Number(form.due_date_offset)
    if (!(bd >= 1 && bd <= 28) || !(off >= 1 && off <= 30)) return Alert.alert('Billing day is 1–28 and due offset 1–30 days')
    setBusy(true)
    try {
      await api(editing ? `/finance/credit_cards/${editing.id}` : '/finance/credit_cards', { method: editing ? 'PATCH' : 'POST', body: { name: form.name, bank: form.bank || null, last4: form.last4 || null, credit_limit: Number(form.credit_limit), billing_date: bd, due_date_offset: off, color: form.color } })
      onSaved()
    } catch (e) { Alert.alert('Could not save', e.message) } finally { setBusy(false) }
  }
  return (
    <FormSheet open={open} onClose={onClose} title={editing ? 'Edit card' : 'Add card'} submitLabel={busy ? 'Saving…' : editing ? 'Update card' : 'Save card'} onSubmit={save} busy={busy}>
      <Field label="Name"><Input value={form.name} onChangeText={(v) => set({ name: v })} placeholder="HDFC Millennia" /></Field>
      <View className="flex-row gap-3">
        <Field label="Bank" style={{ flex: 1 }}><Input value={form.bank} onChangeText={(v) => set({ bank: v })} placeholder="HDFC Bank" /></Field>
        <Field label="Last 4 digits" style={{ flex: 1 }}><Input maxLength={4} keyboardType="number-pad" value={form.last4} onChangeText={(v) => set({ last4: v })} placeholder="1234" /></Field>
      </View>
      <Field label="Credit limit"><Input keyboardType="number-pad" value={form.credit_limit} onChangeText={(v) => set({ credit_limit: v })} /></Field>
      <View className="flex-row gap-3">
        <Field label="Billing day (1-28)" style={{ flex: 1 }}><Input keyboardType="number-pad" value={form.billing_date} onChangeText={(v) => set({ billing_date: v })} /></Field>
        <Field label="Due date offset (days)" style={{ flex: 1 }}><Input keyboardType="number-pad" value={form.due_date_offset} onChangeText={(v) => set({ due_date_offset: v })} /></Field>
      </View>
      <Field label="Colour"><ColorPicker value={form.color} onChange={(c) => set({ color: c })} /></Field>
    </FormSheet>
  )
}

// Port of features/recurring/RecurringManager.jsx + RecurringForm.jsx.
function RecurringForm({ open, onClose, onSaved, editing, accounts, categories }) {
  const initial = editing
    ? { ...editing, amount: String(editing.amount), category_id: editing.category_id || '', notes: editing.notes || '', day_of_month: editing.day_of_month ? String(editing.day_of_month) : '' }
    : { account_id: accounts.find((a) => a.type !== 'debit_card')?.id || '', category_id: '', type: 'expense', amount: '', description: '', notes: '', frequency: 'monthly', day_of_month: String(new Date().getDate()), next_due_date: todayISO(), is_active: true }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(initial) }, [editing, open])
  const set = (p) => setForm((f) => ({ ...f, ...p }))
  const cats = categories.filter((c) => c.type === form.type && !(c.hidden_in_modules || []).includes('recurring'))
  const save = async () => {
    if (!form.description.trim() || !(Number(form.amount) > 0) || !form.account_id) return Alert.alert('Fill in description, amount and account')
    setBusy(true)
    try {
      await api(editing ? `/finance/recurring_transactions/${editing.id}` : '/finance/recurring_transactions', { method: editing ? 'PATCH' : 'POST', body: { account_id: form.account_id, category_id: form.category_id || null, type: form.type, amount: Number(form.amount), description: form.description, notes: form.notes || null, frequency: form.frequency, day_of_month: form.day_of_month ? Number(form.day_of_month) : null, next_due_date: form.next_due_date, is_active: form.is_active !== false } })
      onSaved()
    } catch (e) { Alert.alert('Could not save', e.message) } finally { setBusy(false) }
  }
  return (
    <FormSheet open={open} onClose={onClose} title={editing ? 'Edit recurring rule' : 'New recurring rule'} submitLabel={busy ? 'Saving…' : editing ? 'Update rule' : 'Save rule'} onSubmit={save} busy={busy}>
      <Field label="Type"><Pills value={form.type} onChange={(v) => set({ type: v, category_id: '' })} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} /></Field>
      <View className="flex-row gap-3">
        <Field label="Description" style={{ flex: 3 }}><Input value={form.description} onChangeText={(v) => set({ description: v })} placeholder="Rent" /></Field>
        <Field label="Amount" style={{ flex: 2 }}><Input keyboardType="decimal-pad" value={form.amount} onChangeText={(v) => set({ amount: v })} /></Field>
      </View>
      <Field label="Account"><View className="mt-2"><Select value={form.account_id} onChange={(v) => set({ account_id: v })} placeholder="Choose account…" options={accounts.filter((a) => a.type !== 'debit_card').map((a) => ({ value: a.id, label: a.name }))} /></View></Field>
      <Field label="Category"><View className="mt-2"><Select value={form.category_id} onChange={(v) => set({ category_id: v })} placeholder="Uncategorised" options={[{ value: '', label: 'Uncategorised' }, ...cats.map((c) => ({ value: c.id, label: c.name }))]} /></View></Field>
      <View className="flex-row gap-3">
        <Field label="Repeats" style={{ flex: 1 }}><View className="mt-2"><Select value={form.frequency} onChange={(v) => set({ frequency: v })} options={[{ value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} /></View></Field>
        <Field label="Next due" style={{ flex: 1 }}><DateInput value={form.next_due_date} onChange={(v) => set({ next_due_date: v })} /></Field>
      </View>
      <Text className="mb-3.5 text-[11px] text-slate-500">Any occurrences already due by the time you save will be logged immediately, then it repeats {form.frequency} from there.</Text>
      <Field label="Notes" optional><Input value={form.notes} onChangeText={(v) => set({ notes: v })} /></Field>
    </FormSheet>
  )
}

export function RecurringManager({ open, onClose, data, refresh, showMoney }) {
  const rules = data.recurring_transactions || []
  const [form, setForm] = useState({ open: false, editing: null })
  const toggle = async (r) => { try { await api(`/finance/recurring_transactions/${r.id}`, { method: 'PATCH', body: { is_active: !r.is_active } }); await refresh() } catch { Alert.alert('Update failed') } }
  const remove = (r) => Alert.alert(`Stop "${r.description}"?`, 'Past transactions it already created stay put.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Stop', style: 'destructive', onPress: async () => { try { await api(`/finance/recurring_transactions/${r.id}`, { method: 'DELETE' }); await refresh() } catch { Alert.alert('Delete failed') } } }])
  return (
    <>
      <BottomSheet open={open && !form.open} onOpenChange={(v) => !v && onClose()} title="Recurring transactions">
        <Text className="-mt-1 text-xs text-slate-500">Rent, salary, SIPs, subscriptions — set once, logged automatically.</Text>
        <Pressable onPress={() => setForm({ open: true, editing: null })} className="mt-4">
          <AccentGradient dir="r" style={{ borderRadius: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}><Plus size={15} color="#07101c" /><Text className="text-sm font-semibold text-[#07101c]">New recurring rule</Text></AccentGradient>
        </Pressable>
        <View className="mt-4 gap-2 pb-4">
          {rules.length === 0 ? <Text className={tw('rounded-2xl border border-white/10 light:border-black/10 py-8 text-center text-sm text-slate-500')}>No recurring rules yet.</Text> : rules.map((r) => (
            <View key={r.id} className={tw('rounded-2xl border p-4', r.is_active ? 'border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025]' : 'border-white/5 light:border-black/5 opacity-60')}>
              <View className="flex-row items-start justify-between gap-3">
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className={tw('text-sm font-medium text-white light:text-slate-900')}>{capitalizeFirst(r.description)}</Text>
                  <Text className="mt-0.5 text-xs capitalize text-slate-500">{r.frequency} · {r.type} · {showMoney ? money(r.amount) : '••••'} · next {fmtDate(r.next_due_date)}</Text>
                </View>
                <View className="flex-row gap-1">
                  <Pressable onPress={() => toggle(r)} className={tw('rounded-lg px-2.5 py-1.5', r.is_active ? 'bg-emerald-400/15' : 'bg-white/[.06]')}><Text className={tw('text-[11px] font-medium', r.is_active ? 'text-emerald-200 light:text-emerald-700' : 'text-slate-400')}>{r.is_active ? 'Active' : 'Paused'}</Text></Pressable>
                  <Pressable onPress={() => setForm({ open: true, editing: r })} className="rounded-lg p-1.5"><Icon as={Pencil} size={14} className="text-slate-500" /></Pressable>
                  <Pressable onPress={() => remove(r)} className="rounded-lg p-1.5"><Icon as={Trash2} size={14} className="text-rose-300/70 light:text-rose-700" /></Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>
      </BottomSheet>
      <RecurringForm open={form.open} editing={form.editing} accounts={data.accounts} categories={data.categories} onClose={() => setForm({ open: false, editing: null })} onSaved={async () => { setForm({ open: false, editing: null }); await refresh() }} />
    </>
  )
}

// Port of the web's CsvImport (app/page.js): same per-row parse, duplicate check and import call.
const FIELDS = [
  { key: 'date', label: 'Date', required: true, guess: /date/i },
  { key: 'description', label: 'Description', required: true, guess: /desc|narration|particular|details|remark/i },
  { key: 'amount', label: 'Amount', required: true, guess: /amount|amt|value/i },
  { key: 'type', label: 'Type (income/expense, Cr/Dr)', guess: /type|dr.?\/?.?cr|cr.?\/?.?dr/i },
  { key: 'category', label: 'Category', guess: /categ/i },
  { key: 'notes', label: 'Notes', guess: /note|memo/i },
]
export function CsvImport({ open, onClose, data, refresh }) {
  const { accounts, categories, transactions } = data
  const [parsed, setParsed] = useState(null)
  const [mapping, setMapping] = useState({})
  const [defaultAccount, setDefaultAccount] = useState(accounts.find((a) => a.type !== 'debit_card')?.id || '')
  const [busy, setBusy] = useState(false)
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  useEffect(() => { if (!open) { setParsed(null); setMapping({}) } }, [open])
  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'], copyToCacheDirectory: true })
    if (res.canceled || !res.assets?.[0]) return
    try {
      const text = await new File(res.assets[0].uri).text()
      const out = parseCsv(text)
      if (!out.headers.length) return Alert.alert('That file is empty')
      setParsed(out)
      setMapping(Object.fromEntries(FIELDS.map((f) => [f.key, out.headers.find((h) => f.guess.test(h)) || ''])))
    } catch (e) { Alert.alert('Could not read that file', 'Pick a .csv file (Excel files: save as CSV first).') }
  }
  const parseRow = (r) => {
    const rawAmount = String(r[mapping.amount] || '').replace(/[,₹\s]/g, '')
    const amount = Number(rawAmount)
    const valid = !!amount && !isNaN(amount)
    const rawType = mapping.type ? String(r[mapping.type] || '').toLowerCase() : ''
    let type = 'expense'
    if (rawType.includes('income') || rawType.includes('credit') || rawType === 'cr') type = 'income'
    else if (rawType.includes('expense') || rawType.includes('debit') || rawType === 'dr') type = 'expense'
    else if (rawAmount.startsWith('-')) type = 'expense'
    const catName = mapping.category ? String(r[mapping.category] || '').trim().toLowerCase() : ''
    const cat = catName ? categories.find((c) => c.name.toLowerCase() === catName && c.type === type) : null
    let date = r[mapping.date] || todayISO()
    const m = String(date).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
    if (m) { const y = m[3].length === 2 ? `20${m[3]}` : m[3]; date = `${y}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}` }
    return { valid, type, amount: Math.abs(amount), description: String(r[mapping.description] || 'Import').slice(0, 200), date, account_id: defaultAccount, category_id: cat?.id || null, notes: mapping.notes ? String(r[mapping.notes] || '') : null }
  }
  const rows = useMemo(() => (parsed && mapping.amount && mapping.date ? parsed.rows.map(parseRow).map((p) => ({ ...p, duplicate: transactions.some((t) => t.date === p.date && Number(t.amount) === p.amount && String(t.description || '').trim().toLowerCase() === p.description.trim().toLowerCase() && t.account_id === p.account_id) })) : []), [parsed, mapping, defaultAccount, transactions])
  const toImport = rows.filter((r) => r.valid && !(skipDuplicates && r.duplicate))
  const run = async () => {
    setBusy(true)
    let ok = 0
    for (const r of toImport) {
      const { valid, duplicate, ...payload } = r
      try { await api('/finance/transactions', { method: 'POST', body: { ...payload, status: 'confirmed' } }); ok++ } catch { /* counted below */ }
    }
    setBusy(false)
    await refresh()
    Alert.alert('Import finished', `${ok} of ${toImport.length} transactions imported.`)
    onClose()
  }
  return (
    <BottomSheet open={open} onOpenChange={(v) => !v && onClose()} title="Import from CSV">
      <Text className="-mt-1 text-xs text-slate-500">Map your columns, review exactly what gets created, then import.</Text>
      {!parsed ? (
        <Pressable onPress={pick} className={tw('mt-4 items-center gap-2 rounded-2xl border border-dashed border-white/15 light:border-black/15 py-10')}>
          <Icon as={Upload} size={22} className="text-accent-300 light:text-accent-700" />
          <Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Choose a CSV file</Text>
          <Text className="text-[11px] text-slate-500">Bank statement, spreadsheet export — we'll auto-detect columns</Text>
        </Pressable>
      ) : (
        <View className="mt-4 pb-4">
          <Field label="Default account"><View className="mt-2"><Select value={defaultAccount} onChange={setDefaultAccount} options={accounts.filter((a) => a.type !== 'debit_card').map((a) => ({ value: a.id, label: a.name }))} /></View></Field>
          {FIELDS.map((f) => (
            <Field key={f.key} label={f.label} optional={!f.required}><View className="mt-2"><Select value={mapping[f.key] || ''} onChange={(v) => setMapping((m) => ({ ...m, [f.key]: v }))} placeholder="Not in this file" options={[{ value: '', label: 'Not in this file' }, ...parsed.headers.map((h) => ({ value: h, label: h }))]} /></View></Field>
          ))}
          <Pressable onPress={() => setSkipDuplicates((v) => !v)} className="mb-3 flex-row items-center justify-between rounded-xl bg-black/20 px-4 py-3"><Text className={tw('text-sm text-white light:text-slate-900')}>Skip possible duplicates</Text><Text className={tw('text-xs', skipDuplicates ? 'text-accent-300' : 'text-slate-500')}>{skipDuplicates ? 'On' : 'Off'}</Text></Pressable>
          <Text className="mb-2 text-xs uppercase tracking-widest text-slate-500">Preview · {toImport.length} to import</Text>
          {rows.slice(0, 30).map((p, i) => (
            <View key={i} className={tw('flex-row items-center justify-between gap-3 border-t border-white/5 light:border-black/5 py-2', (!p.valid || (skipDuplicates && p.duplicate)) && 'opacity-50')}>
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className={tw('text-sm text-slate-300 light:text-slate-700')}>{p.description}</Text>
                <Text className="text-[11px] text-slate-500">{p.valid ? fmtDate(p.date) : 'unreadable amount, will be skipped'} · {p.type}{p.duplicate ? ' · possible duplicate' : ''}</Text>
              </View>
              <Text className={tw('text-sm', p.type === 'income' ? 'text-emerald-300' : 'text-rose-300')}>{p.valid ? money(p.amount) : '—'}</Text>
            </View>
          ))}
          {rows.length > 30 ? <Text className="py-2 text-[11px] text-slate-500">…and {rows.length - 30} more</Text> : null}
          <SubmitButton label={busy ? 'Importing…' : `Import ${toImport.length} transaction${toImport.length === 1 ? '' : 's'}`} busy={busy} disabled={!defaultAccount || toImport.length === 0 || !mapping.description} onPress={run} />
        </View>
      )}
    </BottomSheet>
  )
}
