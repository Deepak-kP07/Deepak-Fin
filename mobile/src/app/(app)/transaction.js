import { useMemo, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Feather } from '@expo/vector-icons'
import { Button, Card, Field, Picker, Segmented, styles as ui } from '../../components/ui'
import { useData } from '../../state/DataProvider'
import { api } from '../../lib/api'
import { capitalizeFirst, dateToLocalISO, dayLabel, money, nowTime, todayISO } from '../../lib/format'
import { isModuleLinked, sourceName } from '../../lib/transactions'
import { colors } from '../../lib/theme'

const TYPES = [{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }, { value: 'transfer', label: 'Transfer' }]

// Add or edit a transaction. Mirrors the web TransactionForm's plain expense / income / transfer
// paths and sends the same request bodies. Scheduled (future-dated) entries, repayments, hidden
// transactions and attachments stay on the web app for now.
export default function TransactionScreen() {
  const { id, source } = useLocalSearchParams()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { data, refresh } = useData()
  const { accounts: allAccounts, categories, transactions, credit_cards: creditCards = [], profile } = data
  const editing = id ? transactions.find((t) => t.id === id) : null

  if (id && !editing) {
    return <Shell title="Transaction" onClose={() => router.back()} insets={insets}><Text style={ui.muted}>This transaction no longer exists.</Text></Shell>
  }
  // Transfers and entries created by another module (lend/borrow, loans, card bills, chit funds…)
  // keep their money logic in that module, so they're shown read-only here.
  if (editing && (editing.type === 'transfer' || isModuleLinked(editing))) {
    return <ReadOnly t={editing} data={data} onClose={() => router.back()} refresh={refresh} insets={insets} />
  }
  return <Form editing={editing} defaultSource={source || ''} data={{ allAccounts, categories, creditCards, profile }} refresh={refresh} onClose={() => router.back()} insets={insets} />
}

function Shell({ title, onClose, insets, children, footer }) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[ui.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>{title}</Text>
        <Pressable hitSlop={12} onPress={onClose} accessibilityLabel="Close"><Feather name="x" size={22} color={colors.textMuted} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        {children}
        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function Form({ editing, defaultSource, data, refresh, onClose, insets }) {
  const { allAccounts, categories, creditCards, profile } = data
  const accounts = allAccounts.filter((a) => a.is_active !== false)
  const initial = editing
    ? {
        type: editing.type,
        amount: String(editing.amount ?? ''),
        description: editing.description || '',
        date: editing.date || todayISO(),
        account_id: editing.linked_module === 'credit_card' ? `cc:${editing.linked_module_id}` : editing.account_id || '',
        to_account_id: '',
        category_id: editing.category_id || '',
        notes: editing.notes || '',
      }
    : { type: 'expense', amount: '', description: '', date: todayISO(), account_id: defaultSource, to_account_id: '', category_id: '', notes: '' }
  const [form, setForm] = useState(initial)
  const [showDate, setShowDate] = useState(false)
  const [busy, setBusy] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const realAccounts = accounts.filter((a) => a.type !== 'debit_card')
  const debitCards = accounts.filter((a) => a.type === 'debit_card')
  // Same source rules as the web form: debit cards only spend, credit cards can't be a transfer leg.
  const sourceOptions = useMemo(() => [
    ...realAccounts.map((a) => ({ value: a.id, label: a.name })),
    ...(form.type === 'expense' ? debitCards.map((c) => ({ value: c.id, label: `${c.name} (debit card)` })) : []),
    ...(form.type !== 'transfer' ? creditCards.map((c) => ({ value: `cc:${c.id}`, label: `${c.name} (credit card)` })) : []),
  ], [form.type, accounts, creditCards])
  const destOptions = realAccounts.filter((a) => a.id !== form.account_id).map((a) => ({ value: a.id, label: a.name }))
  const categoryOptions = categories
    .filter((c) => c.type === (form.type === 'income' ? 'income' : 'expense') && !(c.hidden_in_modules || []).includes('transactions'))
    .map((c) => ({ value: c.id, label: c.name }))

  const changeType = (type) => set({ type, category_id: '', to_account_id: '', account_id: type === 'transfer' && form.account_id.startsWith('cc:') ? '' : form.account_id })

  // Port of the web form's warnIfRisky(): a bank/cash account can't go below zero unless the user
  // turned that block off; a credit card can never go past its limit.
  const checkFunds = () => new Promise((resolve) => {
    if (form.type === 'income') return resolve(true)
    const amount = Number(form.amount)
    const originalOut = editing && editing.type !== 'income' ? Number(editing.amount || 0) : 0
    if (form.account_id.startsWith('cc:')) {
      const card = creditCards.find((c) => c.id === form.account_id.slice(3))
      const already = editing?.linked_module === 'credit_card' && editing.linked_module_id === card?.id ? originalOut : 0
      const limit = Number(card?.credit_limit || 0)
      if (card && limit > 0 && Number(card.current_outstanding || 0) - already + amount > limit) {
        Alert.alert('Over the credit limit', `"${card.name}" only has ${money(Math.max(0, limit - Number(card.current_outstanding || 0) + already))} of headroom left.`)
        return resolve(false)
      }
      return resolve(true)
    }
    const resolveId = (aid) => debitCards.find((c) => c.id === aid)?.linked_account_id || aid
    const account = accounts.find((a) => a.id === resolveId(form.account_id))
    const already = account && editing?.linked_module !== 'credit_card' && resolveId(editing?.account_id) === account.id ? originalOut : 0
    if (!account || amount <= already || amount <= Number(account.current_balance || 0) + already) return resolve(true)
    if (profile?.block_insufficient_funds === false) {
      Alert.alert('Not enough balance', `You don't have that much in "${account.name}". Save anyway?`, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Save anyway', onPress: () => resolve(true) },
      ])
      return
    }
    Alert.alert('Not enough balance', `"${account.name}" doesn't have that much, so this is blocked. You may have missed logging some income — or turn this block off in the web app's Profile settings.`)
    resolve(false)
  })

  const save = async () => {
    const amount = Number(form.amount)
    if (!(amount > 0)) return Alert.alert('Enter an amount', 'The amount must be more than zero.')
    if (!form.account_id) return Alert.alert('Choose an account', form.type === 'income' ? 'Pick where the money came in.' : 'Pick where the money came from.')
    if (form.type === 'transfer' && !form.to_account_id) return Alert.alert('Choose where it went', 'Pick the account the money moved to.')
    if (!(await checkFunds())) return
    setBusy(true)
    try {
      const body = {
        type: form.type,
        amount,
        description: form.description.trim(),
        date: form.date,
        time: editing?.time?.slice(0, 5) || nowTime(),
        notes: form.notes.trim() || null,
        category_id: form.type === 'transfer' ? null : form.category_id || null,
        status: 'confirmed',
      }
      if (form.type === 'transfer') {
        body.account_id = form.account_id
        body.to_account_id = form.to_account_id
      } else if (form.account_id.startsWith('cc:')) {
        body.credit_card_id = form.account_id.slice(3)
      } else {
        // A debit card is an alias for its linked bank account.
        body.account_id = debitCards.find((c) => c.id === form.account_id)?.linked_account_id || form.account_id
        // Moving an edited card spend onto a bank account: clear the card link so the server
        // reverses the card's outstanding.
        if (editing?.linked_module === 'credit_card') { body.linked_module = null; body.linked_module_id = null }
      }
      await api(editing ? `/finance/transactions/${editing.id}` : '/finance/transactions', { method: editing ? 'PATCH' : 'POST', body })
      await refresh()
      onClose()
    } catch (e) {
      Alert.alert('Could not save', e.message)
    } finally { setBusy(false) }
  }

  const remove = () => confirmDelete(editing, async () => { await refresh(); onClose() })

  return (
    <Shell
      title={editing ? 'Edit transaction' : 'Add transaction'}
      onClose={onClose}
      insets={insets}
      footer={(
        <View style={{ gap: 10, marginTop: 8 }}>
          <Button label={editing ? 'Save changes' : 'Add transaction'} onPress={save} busy={busy} />
          {editing && <Button label="Delete" variant="danger" icon="trash-2" onPress={remove} />}
        </View>
      )}
    >
      {!editing && <Segmented options={TYPES} value={form.type} onChange={changeType} />}
      <Field label="Amount" value={form.amount} onChangeText={(v) => set({ amount: v.replace(/[^0-9.]/g, '') })} keyboardType="decimal-pad" placeholder="0" autoFocus={!editing} />
      <Field label="Description" value={form.description} onChangeText={(v) => set({ description: v })} placeholder={form.type === 'income' ? 'e.g. Salary' : form.type === 'transfer' ? 'Transfer' : 'e.g. Groceries'} />

      <View style={ui.field}>
        <Text style={ui.fieldLabel}>Date</Text>
        <Pressable onPress={() => setShowDate(true)} style={[ui.input, ui.pickerField]}>
          <Text style={{ color: colors.text, fontSize: 15, flex: 1 }}>{dayLabel(form.date)}</Text>
          <Feather name="calendar" size={16} color={colors.textMuted} />
        </Pressable>
        {showDate && (
          <DateTimePicker
            value={new Date(`${form.date}T12:00:00`)}
            mode="date"
            maximumDate={new Date()}
            onChange={(event, picked) => { setShowDate(false); if (event.type === 'set' && picked) set({ date: dateToLocalISO(picked) }) }}
          />
        )}
      </View>

      <Picker label={form.type === 'income' ? 'Received in' : 'Paid from'} value={form.account_id} options={sourceOptions} onChange={(v) => set({ account_id: v, to_account_id: v === form.to_account_id ? '' : form.to_account_id })} placeholder="Choose an account" />
      {form.type === 'transfer'
        ? <Picker label="To" value={form.to_account_id} options={destOptions} onChange={(v) => set({ to_account_id: v })} placeholder="Choose an account" />
        : <Picker label="Category" value={form.category_id} options={categoryOptions} onChange={(v) => set({ category_id: v })} placeholder="Uncategorised" />}
      <Field label="Notes (optional)" value={form.notes} onChangeText={(v) => set({ notes: v })} placeholder="Anything to remember" multiline style={{ marginBottom: 6 }} />
      {sourceOptions.length === 0 && <Text style={[ui.muted, { marginTop: 8 }]}>You don't have any accounts yet — add one on the web app first.</Text>}
    </Shell>
  )
}

const MODULE_LABEL = {
  lend: 'Lend / Borrow', lend_addition: 'Lend / Borrow', loan: 'Loans', credit_card_bill_payment: 'Credit cards',
  chit_fund_payment: 'Chit funds', chit_fund_payout: 'Chit funds', scholarship: 'Scholarships', money_profile: 'Family / Company',
}

function ReadOnly({ t, data, onClose, refresh, insets }) {
  const { accounts, categories, credit_cards: creditCards = [], transactions } = data
  const isTransfer = t.type === 'transfer'
  const peer = isTransfer ? transactions.find((x) => x.transfer_group_id === t.transfer_group_id && x.id !== t.id) : null
  const out = isTransfer && t.transfer_direction === 'in' ? peer : t
  const into = isTransfer && t.transfer_direction === 'in' ? t : peer
  const moduleLabel = MODULE_LABEL[t.linked_module] || 'another module'
  const rows = [
    ['Amount', money(t.amount)],
    ['Date', dayLabel(t.date)],
    isTransfer ? ['From', accounts.find((a) => a.id === out?.account_id)?.name || '—'] : ['Account', sourceName(t, accounts, creditCards) || '—'],
    isTransfer ? ['To', accounts.find((a) => a.id === into?.account_id)?.name || '—'] : ['Category', categories.find((c) => c.id === t.category_id)?.name || 'Uncategorised'],
    t.notes ? ['Notes', t.notes] : null,
  ].filter(Boolean)
  return (
    <Shell
      title={capitalizeFirst(t.description) || (isTransfer ? 'Transfer' : 'Transaction')}
      onClose={onClose}
      insets={insets}
      footer={isTransfer ? <Button label="Delete transfer" variant="danger" icon="trash-2" style={{ marginTop: 16 }} onPress={() => confirmDelete(t, async () => { await refresh(); onClose() })} /> : null}
    >
      <Card style={{ paddingVertical: 4 }}>
        {rows.map(([k, v]) => (
          <View key={k} style={styles.detailRow}><Text style={ui.muted}>{k}</Text><Text style={styles.detailValue}>{v}</Text></View>
        ))}
      </Card>
      <Text style={[ui.muted, { marginTop: 12, lineHeight: 19 }]}>
        {isTransfer ? 'Editing transfers is coming to the app soon — for now, edit it on the web, or delete it here (both sides are removed).' : `This entry was created by ${moduleLabel}, which keeps its balance in step. Change it from ${moduleLabel} on the web app.`}
      </Text>
    </Shell>
  )
}

function confirmDelete(t, onDone) {
  Alert.alert('Delete this transaction?', t.type === 'transfer' ? 'Both sides of the transfer are removed and the balances restored.' : 'The account balance is restored.', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const result = await api(`/finance/transactions/${t.id}`, { method: 'DELETE' })
          if (result && result.ok === false) throw new Error('The server could not delete it')
          await onDone()
        } catch (e) { Alert.alert('Could not delete', e.message) }
      },
    },
  ])
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  topTitle: { color: colors.text, fontSize: 20, fontWeight: '700', flex: 1, marginRight: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  detailValue: { color: colors.text, fontSize: 15, flexShrink: 1, textAlign: 'right' },
})
