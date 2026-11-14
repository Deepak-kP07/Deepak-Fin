import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import * as WebBrowser from 'expo-web-browser'
import { ChevronRight, Clock, History, Landmark, Paperclip, Trash2, X } from 'lucide-react-native'
import { Icon } from '../../ui/Icon'
import { Select } from '../../ui/Select'
import { ToggleSwitch } from '../../ui/ToggleSwitch'
import { DateInput, INPUT } from '../../ui/FormKit'
import { AccentGradient } from '../../ui/Gradient'
import { usePinDialog } from '../../ui/PinDialog'
import { tw } from '../../lib/tw'
import { api } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { MONTH_NAMES, money, nowTime, todayISO } from '../../lib/format'
import { getCategoryIcon } from '../../lib/categoryIcons'
import { useData } from '../../state/DataProvider'
import { useAuth } from '../../state/AuthProvider'

// Native port of TransactionForm (app/page.js): same fields, rules, and save routing (card bill
// payoff → /pay_bill, loan EMI → /loan_payments, lend repayment link, scheduled + "owes me" link,
// card-funded, debit card → linked bank, hidden with PIN setup, receipt upload, edit history).
const fmtDate = (d) => { if (!d) return ''; const [y, m, dd] = d.split('-').map(Number); return `${String(dd).padStart(2, '0')}-${MONTH_NAMES[m - 1].slice(0, 3)}-${y}` }
const LABEL = 'text-sm text-slate-300 light:text-slate-700'
const ROWBOX = 'flex-row items-center justify-between gap-3 rounded-xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02] px-4 py-3'

export default function TransactionScreen() {
  const params = useLocalSearchParams()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const { data, refresh } = useData()
  const { categories, credit_cards: creditCards = [], lend_borrow: lendBorrow = [], loans = [], transactions, profile } = data
  const accounts = data.accounts.filter((a) => a.is_active !== false)
  const editing = params.id ? [...transactions, ...(data.scheduled_transactions || [])].find((t) => t.id === params.id) : null
  const defaultRepayment = params.repay ? { value: params.repay, type: params.repayType } : null
  const now = todayISO()
  const initial = useMemo(() => (editing
    ? { ...editing, amount: String(editing.amount), time: editing.time?.slice(0, 5) || nowTime(), to_account_id: '', account_id: editing.linked_module === 'credit_card' ? `cc:${editing.linked_module_id}` : (editing.account_id || ''), repay_value: editing.linked_module === 'lend' ? `lend:${editing.linked_module_id}` : '', notes: editing.notes || '', description: editing.description || '' }
    : { type: defaultRepayment?.type || 'expense', amount: '', description: '', date: now, time: nowTime(), account_id: params.source || '', to_account_id: '', category_id: '', notes: '', is_reimbursable: false, is_hidden: false, owe_link: false, owe_person: '', repay_value: defaultRepayment?.value || '' }), [params.id])
  const [form, setForm] = useState(initial)
  const set = (p) => setForm((f) => ({ ...f, ...p }))
  const [purposeMode, setPurposeMode] = useState(initial.repay_value ? 'repayment' : 'category')
  const [busy, setBusy] = useState(false)
  const [attachment, setAttachment] = useState(null) // { uri, name, mimeType }
  const [attachmentRemoved, setAttachmentRemoved] = useState(false)
  const [history, setHistory] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [descFocused, setDescFocused] = useState(false)
  const pinDialog = usePinDialog()

  const isFuture = !!form.date && form.date > todayISO()
  const canOweLink = isFuture && !editing && purposeMode === 'category' && (form.type === 'income' || form.type === 'expense')
  const oweLink = canOweLink && !!form.owe_link
  const canHide = purposeMode !== 'repayment' && !(form.type === 'transfer' && String(form.to_account_id).startsWith('cc:'))
  const realAccounts = accounts.filter((a) => a.type !== 'debit_card')
  const debitCards = accounts.filter((a) => a.type === 'debit_card')
  const sourceOptions = [
    ...realAccounts.map((a) => ({ value: a.id, label: a.name })),
    ...(form.type !== 'transfer' && form.type !== 'income' ? debitCards.map((c) => ({ value: c.id, label: c.name })) : []),
    ...(form.type !== 'transfer' && purposeMode !== 'repayment' ? creditCards.map((c) => ({ value: `cc:${c.id}`, label: c.name })) : []),
  ]
  const hasAnySource = realAccounts.length > 0 || creditCards.length > 0
  const catsForType = categories.filter((c) => c.type === (form.type === 'income' ? 'income' : 'expense') && !(c.hidden_in_modules || []).includes('transactions'))
  const openLends = lendBorrow.filter((l) => l.type === 'lent' && l.status !== 'returned')
  const openBorrows = lendBorrow.filter((l) => l.type === 'borrowed' && l.status !== 'returned')
  const openLoans = !editing ? loans.filter((l) => l.status !== 'closed') : []
  const repayOptions = form.type === 'income'
    ? openLends.map((l) => ({ value: `lend:${l.id}`, label: `${l.person_name} · pending ${money(Number(l.amount) - Number(l.amount_repaid))}` }))
    : form.type === 'expense'
      ? [...openLoans.map((l) => ({ value: `loan:${l.id}`, label: `Loan · ${l.name} · outstanding ${money(Number(l.outstanding))}` })), ...openBorrows.map((l) => ({ value: `lend:${l.id}`, label: `${l.person_name} · pending ${money(Number(l.amount) - Number(l.amount_repaid))}` }))]
      : []
  const canRepay = (form.type === 'income' || form.type === 'expense') && repayOptions.length > 0
  const suggestions = useMemo(() => {
    const byKey = new Map()
    for (const t of transactions) {
      if (t.is_hidden || t.type !== form.type) continue
      const raw = (t.description || '').trim(); if (!raw) continue
      const key = raw.toLowerCase(); const e = byKey.get(key)
      if (e) { e.count += 1; if ((t.date || '') > e.lastDate) { e.lastDate = t.date || ''; e.original = raw } } else byKey.set(key, { original: raw, count: 1, lastDate: t.date || '' })
    }
    return [...byKey.values()].sort((a, b) => b.count - a.count || (a.lastDate < b.lastDate ? 1 : -1))
  }, [transactions, form.type])
  const q = form.description.trim().toLowerCase()
  const shownSuggestions = descFocused && q ? suggestions.filter((s) => s.original.toLowerCase().includes(q) && s.original.toLowerCase() !== q).slice(0, 6) : []

  const changeType = (type) => { setPurposeMode('category'); set({ type, category_id: type === 'transfer' ? '' : (categories.find((c) => c.type === (type === 'income' ? 'income' : 'expense'))?.id || ''), repay_value: '' }) }
  const resetPurpose = (mode) => { setPurposeMode(mode); set({ repay_value: '', category_id: mode === 'category' ? (categories.find((c) => c.type === (form.type === 'income' ? 'income' : 'expense'))?.id || '') : '' }) }
  const post = async (path, body) => { try { await api(`/finance/hidden_pin${path}`, { method: 'POST', body: body || {} }); return { ok: true } } catch (e) { return { ok: false, error: e.message } } }
  const toggleHidden = async () => {
    if (form.is_hidden) return set({ is_hidden: false })
    if (!profile?.has_hidden_pin) {
      let first
      if (!(await pinDialog.ask({ title: 'Create a PIN', message: "4 to 6 digits. You'll need it to see hidden transactions.", confirmLabel: 'Next', submit: async (p) => { first = p; return { ok: true } } }))) return
      if (!(await pinDialog.ask({ title: 'Confirm your PIN', confirmLabel: 'Save PIN', submit: async (p) => (p === first ? post('', { pin: p }) : { ok: false, error: "PINs don't match — try again." }) }))) return
      refresh()
    }
    set({ is_hidden: true })
  }

  const confirmAsk = (msg, label) => new Promise((resolve) => Alert.alert('Please confirm', msg, [{ text: 'Cancel', style: 'cancel', onPress: () => resolve(false) }, { text: label, onPress: () => resolve(true) }]))
  const blockMsg = (msg) => new Promise((resolve) => Alert.alert('Not allowed', msg, [{ text: 'OK', onPress: () => resolve(false) }]))
  // Port of warnIfRisky(): cards never past their limit, warn above 30%; bank/cash blocked when short
  // unless the guardrail is off (then "confirm anyway").
  const warnIfRisky = async () => {
    if (form.type === 'income' || editing?.transfer_direction === 'in') return true
    const amount = Number(form.amount)
    if (!(amount > 0)) return true
    const originalOut = editing && editing.type !== 'income' && editing.status !== 'scheduled' ? Number(editing.amount || 0) : 0
    const resolveId = (id) => debitCards.find((c) => c.id === id)?.linked_account_id || id
    if (String(form.account_id).startsWith('cc:')) {
      const card = creditCards.find((c) => c.id === form.account_id.slice(3))
      if (!card) return true
      const already = editing?.linked_module === 'credit_card' && editing.linked_module_id === card.id ? originalOut : 0
      if (amount <= already) return true
      const outstanding = Math.max(0, Number(card.current_outstanding || 0) - already)
      const limit = Number(card.credit_limit || 0)
      if (limit > 0) {
        const pct = ((outstanding + amount) / limit) * 100
        if (pct >= 100) return blockMsg(`"${card.name}" only has ${money(Math.max(0, limit - outstanding))} of headroom left — this would go over its credit limit.`)
        if (pct > 30) return confirmAsk(`This puts "${card.name}" at ${Math.round(pct)}% of its limit — best practice is staying under 30–40%. Do you want to confirm this payment anyway?`, 'Confirm')
      }
      return true
    }
    const account = accounts.find((a) => a.id === resolveId(form.account_id))
    const already = account && editing?.linked_module !== 'credit_card' && resolveId(editing?.account_id) === account.id ? originalOut : 0
    if (account && amount > already && amount > Number(account.current_balance || 0) + already) {
      if (profile?.block_insufficient_funds === false) return confirmAsk(`You don't have that much money in "${account.name}" — do you want to confirm this payment anyway?`, 'Confirm')
      return blockMsg(`"${account.name}" doesn't have that much balance, so this is blocked. You may have missed logging some income — add it first to keep your accounting accurate, or turn this block off in your Profile settings.`)
    }
    return true
  }

  const pickAttachment = () => Alert.alert('Receipt / attachment', '', [
    { text: 'Photo', onPress: async () => { const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 }); if (!r.canceled && r.assets?.[0]) setAttachment({ uri: r.assets[0].uri, name: r.assets[0].fileName || `receipt-${Date.now()}.jpg`, mimeType: r.assets[0].mimeType || 'image/jpeg' }) } },
    { text: 'Camera', onPress: async () => { const p = await ImagePicker.requestCameraPermissionsAsync(); if (!p.granted) return; const r = await ImagePicker.launchCameraAsync({ quality: 0.8 }); if (!r.canceled && r.assets?.[0]) setAttachment({ uri: r.assets[0].uri, name: `receipt-${Date.now()}.jpg`, mimeType: 'image/jpeg' }) } },
    { text: 'PDF', onPress: async () => { const r = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true }); if (!r.canceled && r.assets?.[0]) setAttachment({ uri: r.assets[0].uri, name: r.assets[0].name, mimeType: 'application/pdf' }) } },
    { text: 'Cancel', style: 'cancel' },
  ])
  // Same storage layout as the web (lib/attachments.js): attachments/<userId>/<txId>/<time>-<name>.
  const uploadAttachment = async (txId) => {
    const body = await (await fetch(attachment.uri)).arrayBuffer()
    const path = `${user.id}/${txId}/${Date.now()}-${attachment.name}`
    const { error } = await supabase.storage.from('attachments').upload(path, body, { contentType: attachment.mimeType, upsert: true })
    if (error) throw error
    await api(`/finance/transactions/${txId}`, { method: 'PATCH', body: { attachment_path: path, attachment_name: attachment.name } })
  }
  const viewAttachment = async () => { try { const { url } = await api(`/finance/transactions/${editing.id}/attachment`); if (url) WebBrowser.openBrowserAsync(url) } catch { /* no-op */ } }
  const toggleHistory = async () => {
    if (historyOpen) return setHistoryOpen(false)
    setHistoryOpen(true)
    if (!history) setHistory(await api(`/finance/transactions/${editing.id}/history`).catch(() => []))
  }

  const save = async () => {
    if (!(Number(form.amount) > 0)) return Alert.alert('Enter an amount')
    if (!form.account_id) return Alert.alert('Choose an account')
    if (form.type === 'transfer' && !form.to_account_id) return Alert.alert('Choose the account it went to')
    if (!form.description.trim()) return Alert.alert('Enter a description')
    if (purposeMode === 'repayment' && !form.repay_value) return Alert.alert('Choose what this repays')
    if (isFuture) {
      const [kind] = purposeMode === 'repayment' ? (form.repay_value || '').split(':') : []
      if ((form.type === 'transfer' && String(form.to_account_id).startsWith('cc:')) || kind === 'loan') return Alert.alert('Not yet', 'Card bill payments and loan EMIs can’t be scheduled yet — log them on the day you pay.')
      if (oweLink && !String(form.owe_person || '').trim()) return Alert.alert('Enter who owes the money (or turn the option off).')
    } else if (!(await warnIfRisky())) return
    if (purposeMode === 'repayment' && String(form.account_id).startsWith('cc:')) return Alert.alert('Choose a bank, cash, or debit account to pay a repayment from — credit cards aren’t supported for this yet.')
    setBusy(true)
    try {
      const [repayKind, repayId] = purposeMode === 'repayment' ? (form.repay_value || '').split(':') : []
      const debitCard = debitCards.find((c) => c.id === form.account_id)
      const payingAccountId = debitCard ? debitCard.linked_account_id : form.account_id
      if (form.type === 'transfer' && String(form.to_account_id).startsWith('cc:')) {
        await api(`/finance/credit_cards/${form.to_account_id.slice(3)}/pay_bill`, { method: 'POST', body: { account_id: payingAccountId, amount: Number(form.amount), date: form.date, notes: form.notes || form.description || null } })
        await refresh(); return router.back()
      }
      if (repayKind === 'loan' && repayId) {
        await api('/finance/loan_payments', { method: 'POST', body: { loan_id: repayId, amount: Number(form.amount), type: 'emi', payment_date: form.date, account_id: payingAccountId, notes: form.notes || form.description || null } })
        await refresh(); return router.back()
      }
      const payload = {
        type: form.type, amount: Number(form.amount), description: form.description, date: form.date, time: form.time || nowTime(), notes: form.notes || null,
        category_id: form.type === 'transfer' || purposeMode === 'repayment' ? null : form.category_id || null,
        is_reimbursable: form.type === 'expense' && String(form.account_id).startsWith('cc:') ? !!form.is_reimbursable : false,
        is_hidden: canHide && !!form.is_hidden, status: isFuture ? 'scheduled' : 'confirmed',
      }
      if (form.type === 'transfer') payload.to_account_id = form.to_account_id
      if (repayKind === 'lend' && repayId) { payload.linked_module = 'lend'; payload.linked_module_id = repayId }
      if (oweLink) {
        const rec = await api('/finance/lend_borrow', { method: 'POST', body: { person_name: String(form.owe_person).trim(), type: form.type === 'income' ? 'lent' : 'borrowed', amount: Number(form.amount), date: todayISO(), due_date: form.date, reason: form.description || null } })
        payload.linked_module = 'lend'; payload.linked_module_id = rec.id
      }
      if (String(form.account_id).startsWith('cc:')) payload.credit_card_id = form.account_id.slice(3)
      else {
        payload.account_id = payingAccountId
        if (editing?.linked_module === 'credit_card') { payload.linked_module = null; payload.linked_module_id = null }
      }
      const saved = await api(editing ? `/finance/transactions/${editing.id}` : '/finance/transactions', { method: editing ? 'PATCH' : 'POST', body: payload })
      const txId = (Array.isArray(saved) ? saved[0] : saved)?.id || editing?.id
      if (attachmentRemoved && editing?.attachment_path) await api(`/finance/transactions/${editing.id}/attachment`, { method: 'DELETE' }).catch(() => {})
      if (attachment && txId) await uploadAttachment(txId).catch(() => Alert.alert('Saved', 'The transaction was saved, but the attachment failed to upload.'))
      await refresh()
      router.back()
    } catch (e) { Alert.alert('Could not save', e.message) } finally { setBusy(false) }
  }
  const remove = () => Alert.alert('Delete this transaction?', editing?.type === 'transfer' ? 'Both sides of the transfer are removed.' : 'The account balance is restored.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await api(`/finance/transactions/${editing.id}`, { method: 'DELETE' }); await refresh(); router.back() } catch (e) { Alert.alert('Could not delete', e.message) } } },
  ])
  const CatIcon = getCategoryIcon(catsForType.find((c) => c.id === form.category_id)?.name)
  const catColor = catsForType.find((c) => c.id === form.category_id)?.color || '#94a3b8'
  const TYPE_TONE = { expense: 'bg-rose-400/15 border-rose-400/30', income: 'bg-emerald-400/15 border-emerald-400/30', transfer: 'bg-accent-400/15 border-accent-400/30' }
  const TYPE_TEXT = { expense: 'text-rose-200 light:text-rose-700', income: 'text-emerald-200 light:text-emerald-700', transfer: 'text-accent-200 light:text-accent-700' }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
      <View className={tw('flex-1 bg-[#141a28] light:bg-white glassy:glass-card')} style={{ paddingTop: insets.top }}>
        <View className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/20" />
        <View className="flex-row items-center justify-between px-5 pt-3">
          <View>
            <Text className={tw('text-base font-semibold text-white light:text-slate-900')}>{editing ? 'Edit transaction' : 'Add transaction'}</Text>
            <Text className="mt-0.5 text-xs text-slate-500">Keep the context, not just the number</Text>
          </View>
          <Pressable onPress={() => router.back()} hitSlop={10} className="rounded-lg p-1.5"><Icon as={X} size={16} className="text-slate-400 light:text-slate-500" /></Pressable>
        </View>
        <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
          <View className="mt-5 flex-row gap-2">
            {['expense', 'income', 'transfer'].map((v) => (
              <Pressable key={v} onPress={() => changeType(v)} className={tw('flex-1 items-center rounded-xl border px-3 py-2', form.type === v ? TYPE_TONE[v] : 'border-white/10 light:border-black/10')}>
                <Text className={tw('text-sm font-medium capitalize', form.type === v ? TYPE_TEXT[v] : 'text-slate-400 light:text-slate-500')}>{v}</Text>
              </Pressable>
            ))}
          </View>

          {canHide && (
            <Pressable onPress={toggleHidden} className={tw('mt-3', ROWBOX)}>
              <View className="flex-1"><Text className={tw(LABEL)}>Hide this transaction</Text><Text className="text-[11px] text-slate-500">{profile?.has_hidden_pin ? 'Keeps it out of every list; still counts in balances and totals' : "Keeps it out of every list — you'll set a PIN first"}</Text></View>
              <ToggleSwitch checked={!!form.is_hidden} onChange={toggleHidden} />
            </Pressable>
          )}

          {!hasAnySource && (
            <View className="mt-5 rounded-xl border border-amber-300/25 bg-amber-300/5 px-4 py-3">
              <View className="flex-row items-center gap-2"><Icon as={Landmark} size={14} className="text-amber-200 light:text-amber-700" /><Text className={tw('text-sm text-amber-200 light:text-amber-700')}>You don't have any accounts yet.</Text></View>
              <Text className={tw('mt-1 text-xs text-amber-200/80 light:text-amber-700')}>Add one from the Accounts tab first.</Text>
            </View>
          )}

          <View className="mt-5 flex-row gap-3">
            <View className="flex-1"><Text className={tw(LABEL)}>Amount</Text><TextInput keyboardType="decimal-pad" value={form.amount} onChangeText={(v) => set({ amount: v.replace(/[^0-9.]/g, '') })} placeholder="0.00" placeholderTextColor="#64748b" autoFocus={!editing} className={tw(INPUT)} /></View>
            <View className="flex-1"><Text className={tw(LABEL)}>Date</Text><DateInput value={form.date} onChange={(v) => set({ date: v, time: nowTime() })} /></View>
          </View>

          {isFuture && (
            <View className="mt-3 rounded-xl border border-sky-300/25 bg-sky-300/5 px-4 py-3">
              <View className="flex-row items-center gap-1.5"><Icon as={Clock} size={13} className="text-sky-200 light:text-sky-800" /><Text className={tw('text-xs font-semibold text-sky-200 light:text-sky-800')}>Scheduled for {fmtDate(form.date)}</Text></View>
              <Text className={tw('mt-0.5 text-xs leading-5 text-sky-200/80 light:text-sky-800/80')}>It won’t count in your balance or totals until you confirm it happened — the app asks you on that day.</Text>
              {canOweLink && (
                <View className="mt-3 border-t border-sky-300/15 pt-3">
                  <Pressable onPress={() => set({ owe_link: !form.owe_link })} className="flex-row items-center justify-between gap-3">
                    <View className="flex-1"><Text className={tw('text-sm text-slate-200 light:text-slate-800')}>{form.type === 'income' ? 'This is money someone owes me' : 'This is money I owe someone'}</Text><Text className={tw('text-[11px] text-slate-400 light:text-slate-500')}>Also tracks it in Lend / Borrow; confirming it later counts as {form.type === 'income' ? 'their repayment' : 'your repayment'}.</Text></View>
                    <ToggleSwitch checked={!!form.owe_link} onChange={() => set({ owe_link: !form.owe_link })} />
                  </Pressable>
                  {form.owe_link && <TextInput value={form.owe_person} onChangeText={(v) => set({ owe_person: v })} placeholder={form.type === 'income' ? 'Who owes you?' : 'Who do you owe?'} placeholderTextColor="#64748b" className={tw(INPUT, 'py-2.5 text-sm')} />}
                </View>
              )}
            </View>
          )}

          <View className="mt-3.5"><Text className={tw(LABEL)}>{form.type === 'transfer' ? 'From account' : 'Account'}</Text><View className="mt-2"><Select value={form.account_id} onChange={(v) => set({ account_id: v })} placeholder="Choose account…" options={sourceOptions} title="Account" /></View></View>

          {form.type === 'transfer' ? (
            <View className="mt-3.5"><Text className={tw(LABEL)}>To account</Text><View className="mt-2"><Select value={form.to_account_id} onChange={(v) => set({ to_account_id: v })} placeholder="Choose destination…" title="To account"
              options={[...realAccounts.filter((a) => a.id !== form.account_id).map((a) => ({ value: a.id, label: a.name })), ...creditCards.filter((c) => Number(c.current_outstanding) > 0).map((c) => ({ value: `cc:${c.id}`, label: `${c.name} · pay bill` }))]} /></View></View>
          ) : (
            <View className="mt-3.5">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  {purposeMode !== 'repayment' && form.category_id ? <View className="h-[26px] w-[26px] items-center justify-center rounded-lg" style={{ backgroundColor: `${catColor}33` }}><CatIcon size={14} color={catColor} /></View> : null}
                  <Text className={tw(LABEL)}>{purposeMode === 'repayment' ? (form.type === 'income' ? 'Repayment from' : 'Repaying') : 'Category'}</Text>
                </View>
                {canRepay && (
                  <View className="flex-row gap-1">
                    {[['category', 'Category'], ['repayment', form.type === 'income' ? 'Repayment' : 'Prepayment']].map(([m, l]) => (
                      <Pressable key={m} onPress={() => resetPurpose(m)} className={tw('rounded-full px-2.5 py-1', purposeMode === m && 'bg-accent-400/15')}><Text className={tw('text-[11px] font-medium', purposeMode === m ? 'text-accent-200 light:text-accent-700' : 'text-slate-500')}>{l}</Text></Pressable>
                    ))}
                  </View>
                )}
              </View>
              <View className="mt-2">
                {purposeMode === 'repayment' && canRepay
                  ? <><Select value={form.repay_value} onChange={(v) => set({ repay_value: v })} placeholder="Choose…" options={repayOptions} title={form.type === 'income' ? 'Repayment from' : 'Repaying'} /><Text className="mt-1 text-[11px] text-slate-500">Auto-marks the debt as partially/fully repaid.</Text></>
                  : <Select value={form.category_id || ''} onChange={(v) => set({ category_id: v })} placeholder="Uncategorised" options={[{ value: '', label: 'Uncategorised' }, ...catsForType.map((c) => ({ value: c.id, label: c.name }))]} title="Category" />}
              </View>
            </View>
          )}

          {form.type === 'expense' && purposeMode !== 'repayment' && String(form.account_id).startsWith('cc:') && (
            <Pressable onPress={() => set({ is_reimbursable: !form.is_reimbursable })} className={tw('mt-3.5', ROWBOX)}>
              <View className="flex-1"><Text className={tw(LABEL)}>Not my spending</Text><Text className="text-[11px] text-slate-500">Someone else will pay this back to you</Text></View>
              <ToggleSwitch checked={!!form.is_reimbursable} onChange={() => set({ is_reimbursable: !form.is_reimbursable })} />
            </Pressable>
          )}

          <View className="mt-3.5">
            <Text className={tw(LABEL)}>Description</Text>
            <TextInput value={form.description} onChangeText={(v) => set({ description: v })} onFocus={() => setDescFocused(true)} onBlur={() => setTimeout(() => setDescFocused(false), 150)}
              placeholder={form.type === 'income' ? 'e.g. Salary, stipend, refund' : form.type === 'transfer' ? 'e.g. Moved to savings' : 'e.g. Groceries at BigBazaar'} placeholderTextColor="#64748b" className={tw(INPUT)} />
            {shownSuggestions.length > 0 && (
              <View className={tw('mt-1 rounded-xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-1.5')}>
                {shownSuggestions.map((s) => (
                  <Pressable key={s.original} onPress={() => { set({ description: s.original }); setDescFocused(false) }} className="flex-row items-center justify-between gap-2 rounded-lg px-3 py-2">
                    <Text numberOfLines={1} className={tw('flex-1 text-sm text-slate-300 light:text-slate-700')}>{s.original}</Text>
                    {s.count > 1 ? <Text className="text-[11px] text-slate-500">×{s.count}</Text> : null}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
          <View className="mt-3.5"><Text className={tw(LABEL)}>Notes</Text><TextInput value={form.notes} onChangeText={(v) => set({ notes: v })} placeholder="Optional context" placeholderTextColor="#64748b" className={tw(INPUT)} /></View>

          <View className="mt-3.5">
            <Text className={tw(LABEL)}>Receipt / attachment</Text>
            {editing?.attachment_path && !attachmentRemoved && !attachment ? (
              <View className={tw('mt-2 flex-row items-center justify-between rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3')}>
                <Pressable onPress={viewAttachment} className="min-w-0 flex-1 flex-row items-center gap-2"><Icon as={Paperclip} size={14} className="text-slate-500" /><Text numberOfLines={1} className={tw('text-sm text-accent-200 light:text-accent-700')}>{editing.attachment_name || 'Attachment'}</Text></Pressable>
                <Pressable onPress={() => setAttachmentRemoved(true)} className="rounded-lg p-1.5"><Icon as={Trash2} size={14} className="text-rose-300/70 light:text-rose-700" /></Pressable>
              </View>
            ) : (
              <Pressable onPress={pickAttachment} className={tw('mt-2 flex-row items-center gap-2 rounded-xl border border-dashed border-white/15 light:border-black/10 bg-white/[.02] light:bg-black/[.02] px-3 py-3')}>
                <Icon as={Paperclip} size={14} className="text-slate-400 light:text-slate-500" />
                <Text numberOfLines={1} className={tw('flex-1 text-sm text-slate-400 light:text-slate-500')}>{attachment ? attachment.name : 'Attach a photo of the receipt (optional)'}</Text>
                {attachment ? <Pressable onPress={() => setAttachment(null)} hitSlop={8}><Icon as={X} size={14} className="text-slate-500" /></Pressable> : null}
              </Pressable>
            )}
          </View>

          {editing && (
            <View className="mt-3.5">
              <Pressable onPress={toggleHistory} className="flex-row items-center gap-1.5"><Icon as={History} size={13} className="text-slate-500" /><Text className="text-xs text-slate-500">{historyOpen ? 'Hide edit history' : 'View edit history'}</Text></Pressable>
              {historyOpen && (
                <View className={tw('mt-2 gap-1.5 rounded-xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02] p-3')}>
                  {history === null ? <ActivityIndicator /> : history.length === 0 ? <Text className="text-xs text-slate-500">No edits recorded yet.</Text> : history.map((h) => (
                    <Text key={h.id} className={tw('text-xs text-slate-400 light:text-slate-500')}><Text className="text-slate-500">{fmtDate(h.changed_at?.slice(0, 10))} {h.changed_at?.slice(11, 16)}</Text>{' — '}{Object.entries(h.previous_values).map(([f, p]) => `${f} was "${p}"`).join(', ')}</Text>
                  ))}
                </View>
              )}
            </View>
          )}

          <Pressable disabled={busy || !hasAnySource} onPress={save} className={tw('mt-6', (busy || !hasAnySource) && 'opacity-60')}>
            <AccentGradient dir="r" style={{ borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {busy ? <ActivityIndicator color="#07101c" /> : <><Text className="text-sm font-semibold text-[#07101c]">{editing ? 'Update transaction' : 'Save transaction'}</Text><ChevronRight size={16} color="#07101c" /></>}
            </AccentGradient>
          </Pressable>
          {editing && <Pressable onPress={remove} className="mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 py-3"><Icon as={Trash2} size={14} className="text-rose-300 light:text-rose-700" /><Text className={tw('text-sm text-rose-300 light:text-rose-700')}>Delete transaction</Text></Pressable>}
        </ScrollView>
      </View>
      {pinDialog.view}
    </KeyboardAvoidingView>
  )
}
