import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as Sharing from 'expo-sharing'
import { File, Paths } from 'expo-file-system'
import { Pencil, Plus, Trash2, Upload } from 'lucide-react-native'
import { Icon } from '../../ui/Icon'
import { BottomSheet } from '../../ui/BottomSheet'
import { AccentGradient } from '../../ui/Gradient'
import { ToggleSwitch } from '../../ui/ToggleSwitch'
import { DateInput, Field, FormSheet, Input, SubmitButton } from '../../ui/FormKit'
import { Select } from '../../ui/Select'
import { tw } from '../../lib/tw'
import { api } from '../../lib/api'
import { toast } from '../../lib/toast'
import { capitalizeFirst, formatDate, money, todayISO } from '../../lib/format'
import { ENTRY_TYPES, ENTRY_TYPE_STYLE, PROFILE_TYPES } from '../../lib/shared'
import { EntryTypeChip } from '../FamilyCompanyView'
import { parseCsv } from '@/lib/csv'

// Ports of features/familyCompany/{MoneyProfileForm, MoneyProfileEntryForm, RecurringEntryManager,
// RecurringEntryForm, MoneyProfileBulkImport}.jsx.
const num = (v) => String(v ?? '').replace(/[^0-9.-]/g, '')
const bankOptions = (accounts, creditCards) => [
  { value: '', label: "Don't post to a bank account" },
  ...accounts.filter((a) => a.type !== 'debit_card').map((a) => ({ value: a.id, label: a.name })),
  ...creditCards.map((c) => ({ value: `cc:${c.id}`, label: `${c.name} (card)` })),
]
const catOptions = (cats) => [{ value: '', label: 'No category' }, ...cats.map((c) => ({ value: c.id, label: c.name }))]
const catsForType = (categories, entryType) => categories.filter((c) => c.type === (entryType === 'expense' ? 'expense' : 'income') && !(c.hidden_in_modules || []).includes('family_company'))

function EntryTypePills({ value, onChange }) {
  return (
    <View className="flex-row gap-2">
      {ENTRY_TYPES.map((t) => {
        const active = value === t.value
        const cls = (ENTRY_TYPE_STYLE[t.value] || '').split(' ')
        return (
          <Pressable key={t.value} onPress={() => onChange(t.value)} className={tw('flex-1 items-center rounded-xl border px-3 py-2', active ? `border-transparent ${cls.filter((c) => c.startsWith('bg-')).join(' ')}` : 'border-white/10 light:border-black/10')}>
            <Text className={tw('text-sm font-medium', active ? cls.filter((c) => !c.startsWith('bg-')).join(' ') : 'text-slate-400 light:text-slate-500')}>{t.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function MoneyProfileForm({ open, onClose, onSaved, editing, accounts }) {
  const blank = () => (editing
    ? { name: editing.name, profile_type: editing.profile_type, opening_balance: String(editing.opening_balance ?? 0), opening_balance_date: editing.opening_balance_date || todayISO(), linked_account_id: editing.linked_account_id || '', notes: editing.notes || '' }
    : { name: '', profile_type: 'family', linked_account_id: '', opening_balance: '0', opening_balance_date: todayISO(), notes: '' })
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm(blank()) }, [editing, open])
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name.trim()) { toast.push('Enter a name.', 'error'); return }
    setBusy(true)
    try {
      const payload = editing
        ? { name: form.name, profile_type: form.profile_type, opening_balance_date: form.opening_balance_date, linked_account_id: form.linked_account_id || null, notes: form.notes || null }
        : { ...form, linked_account_id: form.linked_account_id || null, opening_balance: Number(form.opening_balance || 0) }
      await api(editing ? `/finance/money_profiles/${editing.id}` : '/finance/money_profiles', { method: editing ? 'PATCH' : 'POST', body: payload })
      toast.push(editing ? 'Profile updated' : 'Profile created')
      onSaved()
    } catch (e) { toast.push(e.message, 'error') } finally { setBusy(false) }
  }

  const linkHint = editing
    ? 'Changing this only affects entries you add from now on — transactions already mirrored from past entries stay exactly as they are, under whichever account was linked when they were logged. The opening balance itself moves to the new account (or stops posting anywhere, if unlinked).'
    : form.linked_account_id ? 'Every income/capital/expense entry here will also post as a transaction on this account — including a nonzero opening balance above, as a one-time entry.' : "Entries here won't show up anywhere outside this module."
  return (
    <FormSheet open={open} onClose={onClose} title={editing ? 'Edit profile' : 'New Family / Company profile'} onSubmit={save} busy={busy} submitLabel={busy ? 'Saving…' : editing ? 'Update profile' : 'Create profile'}>
      <Field label="Name"><Input value={form.name} onChangeText={set('name')} placeholder="Home / Dad's finances / Acme Pvt Ltd…" /></Field>
      <Field label="Type"><View className="mt-2"><Select value={form.profile_type} onChange={set('profile_type')} options={PROFILE_TYPES} title="Type" /></View></Field>
      {!editing && <Field label="Opening balance"><Input keyboardType="numbers-and-punctuation" value={form.opening_balance} onChangeText={(v) => set('opening_balance')(num(v))} placeholder="0" /></Field>}
      <Field label="Opening balance date"><DateInput value={form.opening_balance_date} onChange={set('opening_balance_date')} /></Field>
      <Text className="mb-3.5 text-[11px] text-slate-500">The current balance is always opening balance plus every entry logged here, regardless of date — so if you're backfilling old entries, add the real total as of before your earliest entry here to avoid double-counting.</Text>
      <Field label="Link to a bank account" optional hint={linkHint}>
        <View className="mt-2"><Select value={form.linked_account_id} onChange={set('linked_account_id')} options={[{ value: '', label: "Don't link — keep this separate" }, ...accounts.filter((a) => a.type !== 'debit_card').map((a) => ({ value: a.id, label: a.name }))]} title="Link to a bank account" /></View>
      </Field>
      <Field label="Notes" optional><Input value={form.notes} onChangeText={set('notes')} /></Field>
    </FormSheet>
  )
}

export function MoneyProfileEntryForm({ open, onClose, onSaved, editing, profile, accounts = [], creditCards = [], categories = [] }) {
  const blank = () => (editing
    ? { entry_type: editing.entry_type, category_id: editing.category_id || '', description: editing.description || '', amount: String(editing.amount), date: editing.date, paid_party: editing.paid_party || '', notes: editing.notes || '', account_id: editing.credit_card_id ? `cc:${editing.credit_card_id}` : editing.account_id || profile?.linked_account_id || '', is_reimbursable: !!editing.is_reimbursable }
    : { entry_type: 'expense', category_id: '', description: '', amount: '', date: todayISO(), paid_party: '', notes: '', account_id: profile?.linked_account_id || '', is_reimbursable: false })
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm(blank()) }, [editing, open, profile?.id])
  if (!profile) return null
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const isCard = typeof form.account_id === 'string' && form.account_id.startsWith('cc:')

  const save = async () => {
    if (!(Number(form.amount) > 0) || !form.description.trim()) { toast.push('Enter an amount and a description.', 'error'); return }
    setBusy(true)
    try {
      const payload = {
        profile_id: profile.id, entry_type: form.entry_type, category_id: form.category_id || null, description: form.description, amount: Number(form.amount), date: form.date, paid_party: form.paid_party || null, notes: form.notes || null,
        account_id: isCard ? null : form.account_id || null, credit_card_id: isCard ? form.account_id.slice(3) : null,
        is_reimbursable: isCard && form.entry_type === 'expense' ? !!form.is_reimbursable : false,
      }
      await api(editing ? `/finance/money_profile_entries/${editing.id}` : '/finance/money_profile_entries', { method: editing ? 'PATCH' : 'POST', body: payload })
      toast.push(editing ? 'Entry updated' : 'Entry logged')
      onSaved()
    } catch (e) { toast.push(e.message, 'error') } finally { setBusy(false) }
  }

  return (
    <FormSheet open={open} onClose={onClose} title={editing ? 'Edit entry' : `Add entry · ${profile.name}`} onSubmit={save} busy={busy} submitLabel={busy ? 'Saving…' : editing ? 'Update entry' : 'Save entry'}>
      <View className="mb-5"><EntryTypePills value={form.entry_type} onChange={(v) => setForm((f) => ({ ...f, entry_type: v }))} /></View>
      <Field label="Amount"><Input keyboardType="decimal-pad" value={form.amount} onChangeText={(v) => set('amount')(v.replace(/[^0-9.]/g, ''))} /></Field>
      <Field label="Date"><DateInput value={form.date} onChange={set('date')} /></Field>
      <Field label="Description"><Input value={form.description} onChangeText={set('description')} placeholder="Rent, groceries, salary…" /></Field>
      <Field label="Category" optional><View className="mt-2"><Select value={form.category_id || ''} onChange={set('category_id')} options={catOptions(catsForType(categories, form.entry_type))} title="Category" /></View></Field>
      <Field label="Paid to / Received from" optional><Input value={form.paid_party} onChangeText={set('paid_party')} /></Field>
      <Field label="Notes" optional><Input value={form.notes} onChangeText={set('notes')} /></Field>
      <Field label="Bank account or card" optional hint={form.account_id ? 'This entry will also post as a transaction on this account or card.' : "This entry won't show up anywhere outside this module."}>
        <View className="mt-2"><Select value={form.account_id || ''} onChange={set('account_id')} options={bankOptions(accounts, creditCards)} title="Bank account or card" /></View>
      </Field>
      {form.entry_type === 'expense' && isCard && (
        <Pressable onPress={() => set('is_reimbursable')(!form.is_reimbursable)} className={tw('mb-3.5 flex-row items-center justify-between gap-3 rounded-xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02] px-4 py-3')}>
          <View className="flex-1">
            <Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Not my spending</Text>
            <Text className="text-[11px] text-slate-500">Someone else will pay this back to you</Text>
          </View>
          <ToggleSwitch checked={!!form.is_reimbursable} onChange={() => set('is_reimbursable')(!form.is_reimbursable)} />
        </Pressable>
      )}
    </FormSheet>
  )
}

export function RecurringEntryManager({ open, onClose, profile, rules, accounts, creditCards, categories, onToggle, onDelete, onSaved, showMoney }) {
  const [form, setForm] = useState({ open: false, editing: null })
  if (!profile) return null
  return (
    <>
      <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title={`Recurring entries · ${profile.name}`}>
        <Text className="-mt-1 text-xs text-slate-500">Salary, rent, subscriptions — set once, logged automatically.</Text>
        <Pressable onPress={() => setForm({ open: true, editing: null })} className="mt-4">
          <AccentGradient dir="r" style={{ borderRadius: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
            <Plus size={15} color="#07101c" /><Text className="text-sm font-semibold text-[#07101c]">New recurring entry</Text>
          </AccentGradient>
        </Pressable>
        <View className="mt-4 gap-2 pb-4">
          {rules.length === 0 ? (
            <View className={tw('rounded-2xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02] py-8')}><Text className="text-center text-sm text-slate-500">No recurring rules yet.</Text></View>
          ) : rules.map((r) => (
            <View key={r.id} className={tw('rounded-2xl border p-4', r.is_active ? 'border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] glassy:glass-card' : 'border-white/5 light:border-black/5 bg-white/[.015] light:bg-black/[.01] opacity-60')}>
              <View className="flex-row items-start justify-between gap-3">
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <EntryTypeChip type={r.entry_type} />
                    <Text numberOfLines={1} className={tw('flex-shrink text-sm font-medium text-white light:text-slate-900')}>{capitalizeFirst(r.description)}</Text>
                  </View>
                  <Text className="mt-1 text-xs capitalize text-slate-500">{r.frequency} · {showMoney ? money(r.amount) : '••••'} · next {formatDate(r.next_due_date)}</Text>
                </View>
                <View className="flex-row gap-1">
                  <Pressable onPress={() => onToggle(r)} className={tw('rounded-lg px-2.5 py-1.5', r.is_active ? 'bg-emerald-400/15' : 'bg-white/[.06] light:bg-black/[.04]')}>
                    <Text className={tw('text-[11px] font-medium', r.is_active ? 'text-emerald-200 light:text-emerald-700' : 'text-slate-400 light:text-slate-500')}>{r.is_active ? 'Active' : 'Paused'}</Text>
                  </Pressable>
                  <Pressable onPress={() => setForm({ open: true, editing: r })} hitSlop={6} className="rounded-lg p-1.5"><Icon as={Pencil} size={14} className="text-slate-500" /></Pressable>
                  <Pressable onPress={() => onDelete(r)} hitSlop={6} className="rounded-lg p-1.5"><Icon as={Trash2} size={14} className={tw('text-rose-300/70 light:text-rose-700')} /></Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>
      </BottomSheet>
      <RecurringEntryForm open={form.open} editing={form.editing} profile={profile} accounts={accounts} creditCards={creditCards} categories={categories}
        onClose={() => setForm({ open: false, editing: null })} onSaved={async () => { setForm({ open: false, editing: null }); await onSaved() }} />
    </>
  )
}

function RecurringEntryForm({ open, onClose, onSaved, editing, profile, accounts = [], creditCards = [], categories = [] }) {
  const blank = () => (editing
    ? { entry_type: editing.entry_type, category_id: editing.category_id || '', account_id: editing.credit_card_id ? `cc:${editing.credit_card_id}` : editing.account_id || profile?.linked_account_id || '', description: editing.description || '', amount: String(editing.amount), paid_party: editing.paid_party || '', notes: editing.notes || '', frequency: editing.frequency, next_due_date: editing.next_due_date, is_active: editing.is_active }
    : { entry_type: 'expense', category_id: '', account_id: profile?.linked_account_id || '', description: '', amount: '', paid_party: '', notes: '', frequency: 'monthly', next_due_date: todayISO(), is_active: true })
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm(blank()) }, [editing, open, profile?.id])
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!(Number(form.amount) > 0) || !form.description.trim()) { toast.push('Enter a description and an amount.', 'error'); return }
    setBusy(true)
    try {
      const isCard = typeof form.account_id === 'string' && form.account_id.startsWith('cc:')
      const payload = {
        profile_id: profile.id, entry_type: form.entry_type, category_id: form.category_id || null,
        account_id: isCard ? null : form.account_id || null, credit_card_id: isCard ? form.account_id.slice(3) : null,
        description: form.description, amount: Number(form.amount), paid_party: form.paid_party || null, notes: form.notes || null,
        frequency: form.frequency, next_due_date: form.next_due_date, is_active: form.is_active,
      }
      await api(editing ? `/finance/recurring_money_profile_entries/${editing.id}` : '/finance/recurring_money_profile_entries', { method: editing ? 'PATCH' : 'POST', body: payload })
      toast.push(editing ? 'Recurring rule updated' : "Recurring rule added — it'll auto-log from its next due date")
      onSaved()
    } catch (e) { toast.push(e.message, 'error') } finally { setBusy(false) }
  }

  return (
    <FormSheet open={open} onClose={onClose} title={editing ? 'Edit recurring rule' : `New recurring entry · ${profile.name}`} onSubmit={save} busy={busy} submitLabel={busy ? 'Saving…' : editing ? 'Update rule' : 'Save recurring rule'}>
      <View className="mb-4"><EntryTypePills value={form.entry_type} onChange={(v) => setForm((f) => ({ ...f, entry_type: v, category_id: '' }))} /></View>
      <Field label="Description"><Input value={form.description} onChangeText={set('description')} placeholder="e.g. Salary, Rent, Netflix" /></Field>
      <Field label="Amount"><Input keyboardType="decimal-pad" value={form.amount} onChangeText={(v) => set('amount')(v.replace(/[^0-9.]/g, ''))} /></Field>
      <Field label="Category" optional><View className="mt-2"><Select value={form.category_id || ''} onChange={set('category_id')} options={catOptions(catsForType(categories, form.entry_type))} title="Category" /></View></Field>
      <Field label="Bank account or card" optional><View className="mt-2"><Select value={form.account_id} onChange={set('account_id')} options={bankOptions(accounts, creditCards)} title="Bank account or card" /></View></Field>
      <Field label="Paid to / Received from" optional><Input value={form.paid_party} onChangeText={set('paid_party')} /></Field>
      <View className="flex-row gap-3">
        <View className="flex-1"><Field label="Repeats"><View className="mt-2"><Select value={form.frequency} onChange={set('frequency')} title="Repeats" options={[{ value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} /></View></Field></View>
        <View className="flex-1"><Field label="Next due"><DateInput value={form.next_due_date} onChange={set('next_due_date')} /></Field></View>
      </View>
      <Text className="mb-3.5 text-[11px] text-slate-500">Any occurrences already due by the time you save will be logged immediately, then it repeats {form.frequency} from there.</Text>
      <Field label="Notes" optional><Input value={form.notes} onChangeText={set('notes')} placeholder="Optional" /></Field>
    </FormSheet>
  )
}

const IMPORT_FIELDS = [
  { key: 'date', label: 'Date', required: true, guess: /date/i },
  { key: 'description', label: 'Description', required: true, guess: /desc|narration|particular/i },
  { key: 'amount', label: 'Amount', required: true, guess: /amount|value/i },
  { key: 'category', label: 'Category', guess: /categ/i, hint: 'Match this to one of your category names to auto-fill income vs. expense. If your file only marks the type (e.g. a column of "Income"/"Expense"/"Capital"), map that here instead — those are picked up automatically.' },
  { key: 'paid_party', label: 'Paid to / Received from', guess: /paid|received|party/i },
  { key: 'notes', label: 'Notes', guess: /note/i },
]
const detectTypeKeyword = (t) => (t.includes('income') || t === 'cr' || t === 'credit' ? 'income' : t.includes('capital') ? 'capital' : t.includes('expense') || t === 'dr' || t === 'debit' ? 'expense' : null)

export function MoneyProfileBulkImport({ open, onClose, onImported, profile, categories = [] }) {
  const [parsed, setParsed] = useState(null)
  const [mapping, setMapping] = useState({})
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (!open) { setParsed(null); setMapping({}) } }, [open])
  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'], copyToCacheDirectory: true })
    if (res.canceled || !res.assets?.[0]) return
    try {
      const out = parseCsv(await new File(res.assets[0].uri).text())
      if (!out.headers.length) return Alert.alert('That file is empty')
      setParsed(out)
      setMapping(Object.fromEntries(IMPORT_FIELDS.map((f) => [f.key, out.headers.find((h) => f.guess.test(h)) || ''])))
    } catch { Alert.alert('Could not read that file', 'Pick a .csv file (Excel files: save as CSV first).') }
  }
  const downloadTemplate = async () => {
    try {
      const file = new File(Paths.cache, 'family-company-entries-template.csv')
      if (file.exists) file.delete()
      await file.write('date,category,description,amount,paid_party,notes\n15/01/2026,income,January salary,50000,Acme Pvt Ltd,\n18/01/2026,expense,Weekly groceries,2400,BigBasket,\n')
      await Sharing.shareAsync(file.uri, { mimeType: 'text/csv' })
    } catch (e) { Alert.alert('Could not create the template', e.message) }
  }
  const rows = useMemo(() => {
    if (!parsed || !mapping.date || !mapping.amount || !mapping.description) return []
    return parsed.rows.map((r) => {
      const amount = Number(String(r[mapping.amount] || '').replace(/[,₹\s]/g, ''))
      const description = String(r[mapping.description] || '').trim().slice(0, 200)
      const rawCategory = mapping.category ? String(r[mapping.category] || '').trim() : ''
      const keywordType = detectTypeKeyword(rawCategory.toLowerCase())
      const matched = keywordType || !rawCategory ? null : categories.find((c) => c.name.toLowerCase() === rawCategory.toLowerCase()) || null
      let date = r[mapping.date] || todayISO()
      const m = String(date).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
      if (m) { const y = m[3].length === 2 ? `20${m[3]}` : m[3]; date = `${y}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}` }
      return {
        valid: !!description && !!amount && !isNaN(amount), date, entry_type: keywordType || matched?.type || 'expense', category_id: matched?.id || null, categoryName: keywordType ? null : (rawCategory || null),
        description, amount: Math.abs(amount), paid_party: mapping.paid_party ? String(r[mapping.paid_party] || '').trim() || null : null, notes: mapping.notes ? String(r[mapping.notes] || '').trim() || null : null,
      }
    })
  }, [parsed, mapping, categories])
  const toImport = rows.filter((r) => r.valid)
  const net = toImport.reduce((s, r) => s + (r.entry_type === 'expense' ? -r.amount : r.amount), 0)
  const run = async () => {
    setBusy(true)
    let ok = 0
    for (const r of toImport) {
      const { valid, categoryName, ...payload } = r
      try { await api('/finance/money_profile_entries', { method: 'POST', body: { ...payload, profile_id: profile.id } }); ok++ } catch { /* counted below */ }
    }
    setBusy(false)
    Alert.alert('Import finished', `${ok} of ${toImport.length} entries imported.`)
    onImported()
  }
  if (!profile) return null
  return (
    <BottomSheet open={open} onOpenChange={(v) => !v && onClose()} title="Bulk import entries">
      <Text className="-mt-1 text-xs text-slate-500">Into {profile.name} · review before importing</Text>
      {!parsed ? (
        <View className="mt-4 gap-3 pb-4">
          <Pressable onPress={pick} className={tw('items-center gap-2 rounded-2xl border border-dashed border-white/15 light:border-black/15 px-4 py-10')}>
            <Icon as={Upload} size={22} className="text-accent-300 light:text-accent-700" />
            <Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Choose a CSV file</Text>
            <Text className="text-center text-[11px] text-slate-500">Columns: date, category (or type — income/capital/expense), description, amount, paid to / received from</Text>
          </Pressable>
          <Pressable onPress={downloadTemplate} className="self-center"><Text className={tw('text-xs text-accent-200 light:text-accent-700')}>Download a template</Text></Pressable>
        </View>
      ) : (
        <View className="mt-4 pb-4">
          {IMPORT_FIELDS.map((f) => (
            <Field key={f.key} label={f.label} optional={!f.required} hint={f.hint}><View className="mt-2"><Select value={mapping[f.key] || ''} onChange={(v) => setMapping((m) => ({ ...m, [f.key]: v }))} placeholder="Not in this file" options={[{ value: '', label: 'Not in this file' }, ...parsed.headers.map((h) => ({ value: h, label: h }))]} /></View></Field>
          ))}
          <Text className="mb-2 text-xs uppercase tracking-widest text-slate-500">Preview · {toImport.length} to import</Text>
          {rows.slice(0, 30).map((r, i) => (
            <View key={i} className={tw('flex-row items-center justify-between gap-3 border-t border-white/5 light:border-black/5 py-2', !r.valid && 'opacity-50')}>
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className={tw('text-sm text-slate-300 light:text-slate-700')}>{r.description || '—'}</Text>
                <Text className="text-[11px] capitalize text-slate-500">{r.valid ? formatDate(r.date) : 'missing description/amount, will be skipped'} · {r.entry_type}{r.categoryName ? ` · ${r.categoryName}` : ''}</Text>
              </View>
              <Text className={tw('text-sm text-slate-300 light:text-slate-700')}>{r.valid ? money(r.amount) : '—'}</Text>
            </View>
          ))}
          {rows.length > 30 ? <Text className="py-2 text-[11px] text-slate-500">…and {rows.length - 30} more</Text> : null}
          <Text className={tw('mt-3 text-xs text-slate-400 light:text-slate-500')}>Net effect on balance: <Text className={tw('font-semibold text-white light:text-slate-900')}>{net >= 0 ? '+' : '−'}{money(Math.abs(net))}</Text></Text>
          <SubmitButton label={busy ? 'Importing…' : `Import ${toImport.length} entr${toImport.length === 1 ? 'y' : 'ies'}`} busy={busy} disabled={toImport.length === 0} onPress={run} />
        </View>
      )}
    </BottomSheet>
  )
}
