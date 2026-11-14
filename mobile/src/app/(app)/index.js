import { useEffect, useState } from 'react'
import { Alert, BackHandler, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as SecureStore from 'expo-secure-store'
import { Bell, MoreHorizontal, Plus, Settings } from 'lucide-react-native'
import { Icon } from '../../ui/Icon'
import { Avatar } from '../../ui/Avatar'
import { AccentGradient } from '../../ui/Gradient'
import { BottomSheet } from '../../ui/BottomSheet'
import { DashboardView } from '../../views/DashboardView'
import { NetWorthDetailView } from '../../views/NetWorthDetailView'
import { TransactionsView } from '../../views/TransactionsView'
import { AccountsView } from '../../views/AccountsView'
import { CreditCardsView } from '../../views/CreditCardsView'
import { SettingsView } from '../../views/SettingsView'
import { VaultView } from '../../views/VaultView'
import { LoansView } from '../../views/LoansView'
import { LoanForm, LoanPaymentForm } from '../../views/forms/LoanForms'
import { toast } from '../../lib/toast'
import { LendBorrowView } from '../../views/LendBorrowView'
import { LendAddMoreForm, LendForm } from '../../views/forms/LendForms'
import { ManageAccessSheet } from '../../views/forms/ManageAccessSheet'
import { usePrompt } from '../../ui/PromptDialog'
import { ChitFundsView } from '../../views/ChitFundsView'
import { BucketForm, BucketListView } from '../../views/BucketListView'
import { ChitFundForm, ChitFundPaymentForm, ChitFundPayoutForm } from '../../views/forms/ChitFundForms'
import { AccountForm } from '../../views/forms/AccountForm'
import { CreditCardForm, CsvImport, RecurringManager } from '../../views/forms/MiscForms'
import { tw } from '../../lib/tw'
import { useAuth } from '../../state/AuthProvider'
import { useData } from '../../state/DataProvider'
import { orderedEnabledKeys, resolveMobileNavSlots, resolveModuleSettings } from '../../lib/shared'
import { MOBILE_MANDATORY_META, NAV_META } from '../../lib/navMeta'
import { api } from '../../lib/api'
import { enablePush, pushPermissionStatus } from '../../lib/push'

// Native port of the PWA's Shell (app/page.js): one screen whose `view` switches what's shown,
// the Dashboard header, the configurable 3-slot bottom nav + "More" sheet, and the floating
// quick-add button. Modules not yet ported open their interim native screens.
const INTERIM_ROUTES = {
  family_company: '/family', budgets: '/budgets',
  investments: '/investments', scholarships: '/scholarships', insights: '/insights',
}
const PUSH_PROMPTED_KEY = 'push_prompted'

// "Type DELETE to confirm" — Android has no Alert.prompt, so this is a small themed modal.
function TypeToConfirm({ state, onClose }) {
  const [text, setText] = useState('')
  useEffect(() => { setText('') }, [state])
  return (
    <Modal visible={!!state} transparent animationType="fade" onRequestClose={() => onClose(false)} statusBarTranslucent>
      <Pressable onPress={() => onClose(false)} className="flex-1 items-center justify-center bg-black/60 p-4">
        {state && (
          <Pressable onPress={() => {}} className={tw('w-full max-w-sm rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6')}>
            <Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>{state.title}</Text>
            <Text className={tw('mt-1 text-xs leading-5 text-slate-400 light:text-slate-500')}>{state.message}</Text>
            <TextInput autoFocus value={text} onChangeText={setText} autoCapitalize="characters" placeholder="DELETE" placeholderTextColor="#64748b" className={tw('mt-4 rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] px-3 py-2.5 text-white light:text-slate-900')} />
            <View className="mt-5 flex-row justify-end gap-2">
              <Pressable onPress={() => onClose(false)} className={tw('rounded-xl border border-white/10 light:border-black/10 px-4 py-2.5')}><Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Cancel</Text></Pressable>
              <Pressable disabled={text.trim() !== 'DELETE'} onPress={() => onClose(true)} className={tw('rounded-xl bg-rose-500/20 px-4 py-2.5', text.trim() !== 'DELETE' && 'opacity-40')}><Text className={tw('text-sm font-semibold text-rose-200 light:text-rose-700')}>{state.confirmLabel}</Text></Pressable>
            </View>
          </Pressable>
        )}
      </Pressable>
    </Modal>
  )
}

export default function Shell() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user, signOut } = useAuth()
  const { data, refresh, loading } = useData()
  const [view, setViewState] = useState('dashboard')
  const [settingsSection, setSettingsSection] = useState('profile')
  const [moreOpen, setMoreOpen] = useState(false)
  const [showMoney, setShowMoney] = useState(true)
  const [hasGreetedOnce, setHasGreetedOnce] = useState(false)
  const [unread, setUnread] = useState(0)
  const [activeDetailId, setActiveDetailId] = useState(null)
  const [accountForm, setAccountForm] = useState({ open: false, editing: null })
  const [cardForm, setCardForm] = useState({ open: false, editing: null })
  const [recurringOpen, setRecurringOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)
  const [typeConfirm, setTypeConfirm] = useState(null)
  const [loanForm, setLoanForm] = useState({ open: false, editing: null })
  const [loanPay, setLoanPay] = useState(null)
  const [lendForm, setLendForm] = useState({ open: false, editing: null })
  const [lendAddRecord, setLendAddRecord] = useState(null)
  const [shareSheet, setShareSheet] = useState(null) // { kind: 'lend' | 'profile', target }
  const prompt = usePrompt()
  const [chitForm, setChitForm] = useState({ open: false, editing: null })
  const [chitPayment, setChitPayment] = useState(null) // { fund, editing }
  const [chitPayout, setChitPayout] = useState(null)
  const [bucketForm, setBucketForm] = useState({ open: false, editing: null })
  useEffect(() => { setActiveDetailId(null) }, [view])

  useEffect(() => { const t = setTimeout(() => setHasGreetedOnce(true), 2200); return () => clearTimeout(t) }, [])
  useEffect(() => { api('/finance/notifications').then((r) => setUnread(r.unread || 0)).catch(() => {}) }, [data])
  // First launch: ask once for notification permission (Android 13+ shows the system prompt).
  useEffect(() => {
    if (loading || !data.profile) return
    ;(async () => {
      if (await SecureStore.getItemAsync(PUSH_PROMPTED_KEY)) return
      await SecureStore.setItemAsync(PUSH_PROMPTED_KEY, '1')
      if ((await pushPermissionStatus()) === 'undetermined') await enablePush().catch(() => {})
    })()
  }, [loading, !!data.profile])
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (moreOpen) { setMoreOpen(false); return true }
      if (view === 'networth') { setViewState('dashboard'); return true }
      if (view !== 'dashboard') { setViewState('dashboard'); return true }
      return false
    })
    return () => sub.remove()
  }, [view, moreOpen])

  const setView = (key) => {
    if (key === 'credit_cards') key = 'cards'
    if (INTERIM_ROUTES[key]) { router.push(INTERIM_ROUTES[key]); return }
    setViewState(key)
  }
  const openTxForm = (params) => router.push(params ? { pathname: '/transaction', params } : '/transaction')
  const editTx = (t) => router.push({ pathname: '/transaction', params: { id: t.id } })
  const confirmDelete = (title, message, run) => Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: run }])

  const runFabAction = () => {
    if (view === 'accounts') return activeDetailId ? openTxForm({ source: activeDetailId }) : setAccountForm({ open: true, editing: null })
    if (view === 'cards') return activeDetailId ? openTxForm({ source: `cc:${activeDetailId}` }) : setCardForm({ open: true, editing: null })
    if (view === 'lend') { const r = data.lend_borrow.find((l) => l.id === activeDetailId); return r ? logLendRepayment(r) : setLendForm({ open: true, editing: null }) }
    if (view === 'chitfunds') { const f = data.chit_funds.find((c) => c.id === activeDetailId); return f ? setChitPayment({ fund: f, editing: null }) : setChitForm({ open: true, editing: null }) }
    if (view === 'bucket') return setBucketForm({ open: true, editing: null })
    if (view === 'loans') { const loan = data.loans.find((l) => l.id === activeDetailId); return loan ? setLoanPay(loan) : setLoanForm({ open: true, editing: null }) }
    return openTxForm()
  }
  const saveProfile = async (body) => { try { await api('/finance/profile', { method: 'PATCH', body }); await refresh() } catch (e) { Alert.alert('Could not save', e.message) } }
  const deleteTxBulk = (ids) => new Promise((resolve) => {
    const n = ids.length
    if (n === 0) return resolve(false)
    Alert.alert(`Delete ${n} transaction${n === 1 ? '' : 's'}?`, 'Account balances are restored.', [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const all = [...data.transactions, ...(data.scheduled_transactions || [])]
        const seen = new Set()
        const targets = ids.filter((id) => { const t = all.find((x) => x.id === id); if (!t?.transfer_group_id) return true; if (seen.has(t.transfer_group_id)) return false; seen.add(t.transfer_group_id); return true })
        const results = await Promise.all(targets.map((id) => api(`/finance/transactions/${id}`, { method: 'DELETE' }).then(() => true, () => false)))
        await refresh()
        const failed = results.filter((ok) => !ok).length
        if (failed) Alert.alert('Some deletes failed', `${targets.length - failed} of ${targets.length} deleted.`)
        resolve(true)
      } },
    ])
  })
  const deleteCardActivityBulk = (rows) => new Promise((resolve) => {
    const n = rows.length
    if (n === 0) return resolve(false)
    Alert.alert(`Delete ${n} ${n === 1 ? 'entry' : 'entries'}?`, 'Card outstanding will be recomputed.', [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const results = await Promise.all(rows.map((a) => api(a.source === 'log' ? `/finance/credit_card_transactions/${a.row.id}` : `/finance/transactions/${a.row.id}`, { method: 'DELETE' }).then(() => true, () => false)))
        await refresh()
        const failed = results.filter((ok) => !ok).length
        if (failed) Alert.alert('Some deletes failed', `${n - failed} of ${n} deleted.`)
        resolve(true)
      } },
    ])
  })
  // Loans — same handlers as the PWA's Shell (app/page.js).
  const deleteLoan = (l, after) => confirmDelete(`Delete loan "${l.name}"?`, 'All payment records will be removed.', async () => { try { await api(`/finance/loans/${l.id}`, { method: 'DELETE' }); after?.(); toast.push('Loan deleted'); await refresh() } catch (e) { toast.push(e.message, 'error') } })
  const deleteLoanPayment = (p) => confirmDelete('Reverse this payment?', 'The linked transaction and outstanding will restore.', async () => { try { await api(`/finance/loan_payments/${p.id}`, { method: 'DELETE' }); toast.push('Payment reversed'); await refresh() } catch { toast.push('Delete failed', 'error') } })
  // Reversals must run one at a time, newest first — each restores from its own snapshot.
  const deleteLoanPaymentBulk = (payments) => new Promise((resolve) => {
    const n = payments.length
    if (n === 0) return resolve(false)
    Alert.alert(`Reverse ${n} payment${n === 1 ? '' : 's'}?`, 'The linked transactions and outstanding will restore.', [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Reverse', style: 'destructive', onPress: async () => {
        const ordered = [...payments].sort((a, b) => (a.payment_date === b.payment_date ? new Date(b.created_at) - new Date(a.created_at) : new Date(b.payment_date) - new Date(a.payment_date)))
        let failed = 0
        for (const p of ordered) { try { await api(`/finance/loan_payments/${p.id}`, { method: 'DELETE' }) } catch { failed++ } }
        await refresh()
        toast.push(failed > 0 ? `${n - failed} of ${n} payments reversed — ${failed} failed` : `${n} payment${n === 1 ? '' : 's'} reversed`, failed > 0 ? 'error' : undefined)
        resolve(true)
      } },
    ])
  })
  const syncLoanOutstanding = async (loan, target) => { try { await api('/finance/loan_payments', { method: 'POST', body: { loan_id: loan.id, type: 'adjustment', target_outstanding: target } }); toast.push('Outstanding synced'); await refresh() } catch (e) { toast.push(e.message || 'Sync failed', 'error') } }
  // Lend & borrow
  const logLendRepayment = (record) => openTxForm({ repay: `lend:${record.id}`, repayType: record.type === 'lent' ? 'income' : 'expense' })
  const deleteLend = (l, after) => confirmDelete(`Delete record for ${l.person_name}?`, 'Linked transaction (if any) will be removed too.', async () => { try { await api(`/finance/lend_borrow/${l.id}`, { method: 'DELETE' }); after?.(); toast.push('Deleted'); await refresh() } catch { toast.push('Delete failed', 'error') } })
  const deleteTx = (t) => confirmDelete('Delete this transaction?', 'Balances will be recomputed.', async () => { try { await api(`/finance/transactions/${t.id}`, { method: 'DELETE' }); toast.push('Transaction deleted'); await refresh() } catch (e) { toast.push(e.message, 'error') } })
  const editAdditionNote = async (a) => {
    const value = await prompt.ask('Note for this top-up', { defaultValue: a.notes || '', placeholder: 'e.g. Diwali advance' })
    if (value === null) return
    try { await api(`/finance/lend_borrow_additions/${a.id}`, { method: 'PATCH', body: { notes: value.trim() } }); toast.push('Note updated'); await refresh() } catch { toast.push('Could not update', 'error') }
  }
  // Chit funds — take_payout/undo_payout/complete/reopen are dedicated action endpoints.
  const chitAction = async (fund, action, done) => { try { await api(`/finance/chit_funds/${fund.id}/${action}`, { method: 'POST' }); toast.push(done); await refresh() } catch (e) { toast.push(e.message, 'error') } }
  const deleteChitFund = (c, after) => confirmDelete(`Delete chit fund "${c.name}"?`, 'All payment records and any linked transactions will be removed.', async () => { try { await api(`/finance/chit_funds/${c.id}`, { method: 'DELETE' }); after?.(); toast.push('Chit fund deleted'); await refresh() } catch { toast.push('Delete failed', 'error') } })
  const deleteChitPaymentNow = async (id) => { try { await api(`/finance/chit_fund_payments/${id}`, { method: 'DELETE' }); return true } catch { return false } }
  const deleteChitFundPayment = async (id, silent) => {
    if (silent) { const ok = await deleteChitPaymentNow(id); await refresh(); if (!ok) toast.push('Delete failed', 'error'); return }
    confirmDelete('Delete this payment?', 'Its linked transaction (if any) will be removed too.', async () => { const ok = await deleteChitPaymentNow(id); toast.push(ok ? 'Payment deleted' : 'Delete failed', ok ? undefined : 'error'); await refresh() })
  }
  const dropdownAccounts = data.accounts.filter((a) => a.is_active !== false)
  const toggleIncludeInNetWorth = async (table, row) => { try { await api(`/finance/${table}/${row.id}`, { method: 'PATCH', body: { include_in_net_worth: row.include_in_net_worth === false } }); await refresh() } catch { Alert.alert('Update failed') } }
  const toggleIncludeInNetWorthGroup = async (table, rows, next) => { try { await Promise.all(rows.map((r) => api(`/finance/${table}/${r.id}`, { method: 'PATCH', body: { include_in_net_worth: next } }))); await refresh() } catch { Alert.alert('Update failed') } }
  const deleteUserAccount = () => setTypeConfirm({
    title: 'Delete your Personal Fin account?', message: 'Your login, every record, and every uploaded file will be permanently erased. This cannot be undone. Type DELETE to confirm.', confirmLabel: 'Delete account',
    run: async () => { try { await api('/account/delete', { method: 'POST', body: { confirm: 'DELETE' } }); await signOut(); Alert.alert('Your account has been deleted') } catch (e) { Alert.alert('Could not delete your account', e.message) } },
  })
  const clearAllData = () => setTypeConfirm({
    title: 'Clear all data?', message: 'Permanently delete every account, transaction, and record you have across the app? Your login stays. Type DELETE to confirm.', confirmLabel: 'Delete everything',
    run: async () => { try { await api('/account/clear_data', { method: 'POST' }); await refresh(); Alert.alert('All your data has been deleted') } catch { Alert.alert('Could not clear your data') } },
  })

  const profile = data.profile
  const moduleSettings = resolveModuleSettings(profile)
  const mobileDestinations = [
    MOBILE_MANDATORY_META.dashboard, MOBILE_MANDATORY_META.transactions, MOBILE_MANDATORY_META.accounts,
    ...orderedEnabledKeys(moduleSettings).filter((k) => NAV_META[k]).map((k) => NAV_META[k]),
  ]
  const mobileNavSlots = resolveMobileNavSlots(profile, mobileDestinations.map((d) => d.key))
  const primaryMobileNav = mobileNavSlots.map((key) => mobileDestinations.find((d) => d.key === key)).filter(Boolean)
  const morePanelItems = [...mobileDestinations.filter((d) => !mobileNavSlots.includes(d.key)), { key: 'profile', label: 'Settings', icon: Settings }]
  const isMoreActive = morePanelItems.some((n) => n.key === view)
  const navActive = view === 'networth' ? 'dashboard' : view

  const firstName = profile?.full_name?.split(' ')?.[0] || user?.user_metadata?.full_name?.split(' ')?.[0] || user?.email?.split('@')?.[0] || ''
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''
  const page = (children) => (
    <ScrollView key={view} contentContainerStyle={{ paddingTop: Math.max(24, insets.top + 24), paddingBottom: 96 + insets.bottom }} className="px-5" keyboardShouldPersistTaps="handled">{children}</ScrollView>
  )

  return (
    <View className="flex-1">
      {view === 'dashboard' && page(
        <>
          <View className="mb-6 flex-row items-center justify-between">
            <Pressable onPress={() => { setSettingsSection('profile'); setView('profile') }} className="-m-1 min-w-0 flex-1 flex-row items-center gap-2.5 rounded-xl p-1">
              <Avatar src={avatarUrl} name={firstName} email={user?.email} size={38} />
              <Text numberOfLines={1} className={tw('min-w-0 flex-1 text-lg font-semibold text-white light:text-slate-900')}>
                {hasGreetedOnce ? `${firstName} 👋` : <><Text className={tw('font-normal text-slate-400 light:text-slate-500')}>Welcome back,</Text> {firstName} 👋</>}
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push('/notifications')} className={tw('relative rounded-xl border border-white/10 light:border-black/10 p-2.5')}>
              <Icon as={Bell} size={16} className="text-slate-400 light:text-slate-500" />
              {unread > 0 && <View className="absolute -right-1.5 -top-1.5 h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1"><Text className="text-[10px] font-semibold text-white">{unread > 9 ? '9+' : unread}</Text></View>}
            </Pressable>
          </View>
          <DashboardView data={data} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onOpenTxForm={() => openTxForm()} setView={setView}
            onManageMoneyRules={() => { setSettingsSection('money_rules'); setView('profile') }} onPayCardBill={(card) => router.push({ pathname: '/forms/pay-card', params: { id: card.id } })}
            onOpenNetWorthDetail={() => setView('networth')} />
        </>,
      )}
      {view === 'networth' && page(<NetWorthDetailView data={data} showMoney={showMoney} onBack={() => setView('dashboard')} setView={setView} onToggle={toggleIncludeInNetWorth} onToggleGroup={toggleIncludeInNetWorthGroup} />)}
      {view === 'transactions' && page(
        <TransactionsView data={data} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onOpenTxForm={() => openTxForm()} onEditTx={editTx} onDeleteTxBulk={deleteTxBulk}
          onPayCardBill={(card) => router.push({ pathname: '/forms/pay-card', params: { id: card.id } })} onImport={() => setCsvOpen(true)} onOpenRecurring={() => setRecurringOpen(true)} />,
      )}
      {view === 'accounts' && page(
        <AccountsView data={data} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onDetailChange={setActiveDetailId} onEditTx={editTx} onDeleteTxBulk={deleteTxBulk}
          onEdit={(a) => setAccountForm({ open: true, editing: a })}
          onDelete={(a, after) => confirmDelete(`Delete "${a.name}"?`, 'Its transactions stay but lose the account link.', async () => { try { await api(`/finance/accounts/${a.id}`, { method: 'DELETE' }); after?.(); await refresh() } catch (e) { Alert.alert('Delete failed', e.message) } })}
          onSyncBalance={async (a, target) => { try { await api(`/finance/accounts/${a.id}/sync_balance`, { method: 'POST', body: { target_balance: target } }); await refresh() } catch (e) { Alert.alert('Sync failed', e.message) } }} />,
      )}
      {view === 'cards' && page(
        <CreditCardsView data={data} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onDetailChange={setActiveDetailId}
          onSpend={(card) => openTxForm({ source: `cc:${card.id}` })} onPay={(card) => router.push({ pathname: '/forms/pay-card', params: { id: card.id } })} onEditTx={editTx}
          onDeleteActivityBulk={deleteCardActivityBulk} onDeleteTxBulk={deleteTxBulk} onEdit={(c) => setCardForm({ open: true, editing: c })}
          onSyncOutstanding={async (card, target) => { try { await api(`/finance/credit_cards/${card.id}/sync_outstanding`, { method: 'POST', body: { target_outstanding: target } }); await refresh() } catch (e) { Alert.alert('Sync failed', e.message) } }}
          onDelete={(card, after) => confirmDelete(`Delete card "${card.name}"?`, 'All linked spends will be removed.', async () => { try { await api(`/finance/credit_cards/${card.id}`, { method: 'DELETE' }); after?.(); await refresh() } catch (e) { Alert.alert('Delete failed', e.message) } })} />,
      )}
      {view === 'loans' && page(
        <LoansView data={data} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onDetailChange={setActiveDetailId}
          onAdd={() => setLoanForm({ open: true, editing: null })} onEdit={(l) => setLoanForm({ open: true, editing: l })} onDelete={deleteLoan}
          onPay={setLoanPay} onDeletePayment={deleteLoanPayment} onDeletePaymentBulk={deleteLoanPaymentBulk} onSync={syncLoanOutstanding} />,
      )}
      {view === 'lend' && page(
        <LendBorrowView data={data} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onDetailChange={setActiveDetailId}
          onAdd={() => setLendForm({ open: true, editing: null })} onEdit={(l) => setLendForm({ open: true, editing: l })} onDelete={deleteLend} onDeleteTx={deleteTx} onDeleteTxBulk={deleteTxBulk}
          onLogRepayment={logLendRepayment} onAddMore={setLendAddRecord} onEditAdditionNote={editAdditionNote} onManageAccess={(r) => setShareSheet({ kind: 'lend', target: r })} />,
      )}
      {view === 'chitfunds' && page(
        <ChitFundsView data={data} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onDetailChange={setActiveDetailId}
          onAdd={() => setChitForm({ open: true, editing: null })} onEdit={(c) => setChitForm({ open: true, editing: c })} onDelete={deleteChitFund}
          onLogPayment={(fund) => setChitPayment({ fund, editing: null })} onEditPayment={(fund, editing) => setChitPayment({ fund, editing })} onTakePayout={setChitPayout}
          onUndoPayout={(fund) => Alert.alert('Undo this payout?', 'Its linked transaction (if any) will be removed.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Undo payout', style: 'destructive', onPress: () => chitAction(fund, 'undo_payout', 'Payout undone') }])}
          onComplete={(fund) => chitAction(fund, 'complete', 'Marked completed')} onReopen={(fund) => chitAction(fund, 'reopen', 'Reopened')} onDeletePayment={deleteChitFundPayment} />,
      )}
      {view === 'bucket' && page(
        <BucketListView data={data} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onAdd={() => setBucketForm({ open: true, editing: null })} onEdit={(b) => setBucketForm({ open: true, editing: b })}
          onDelete={(b) => confirmDelete(`Remove "${b.title}" from bucket list?`, '', async () => { try { await api(`/finance/bucket_list/${b.id}`, { method: 'DELETE' }); toast.push('Removed'); await refresh() } catch (e) { toast.push(e.message, 'error') } })} />,
      )}
      {view === 'profile' && page(
        <SettingsView data={data} user={user} refresh={refresh} section={settingsSection} onSectionChange={setSettingsSection} onSaveProfile={saveProfile}
          onDeleteAccount={deleteUserAccount} onClearAllData={clearAllData} onSignOut={() => Alert.alert('Sign out?', '', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', onPress: signOut }])}
          onHiddenPinChanged={() => refresh()} renderVault={() => <VaultView data={data} refresh={refresh} />} />,
      )}

      <Pressable onPress={runFabAction} className="absolute right-5 z-30 h-14 w-14" style={{ bottom: 96 + insets.bottom }}>
        <AccentGradient style={{ flex: 1, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 16 }}>
          <Plus size={24} color="#07101c" />
        </AccentGradient>
      </Pressable>

      <View className={tw('absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 light:border-black/10 bg-[#0b0f18]/95 light:bg-white/90 glassy:glass-nav')} style={{ paddingBottom: insets.bottom }}>
        <View className="flex-row">
          {primaryMobileNav.map((n) => {
            const active = navActive === n.key
            return (
              <Pressable key={n.key} onPress={() => setView(n.key)} className="flex-1 items-center gap-1 py-3">
                <Icon as={n.icon} size={18} className={active ? 'text-accent-300 light:text-accent-700' : 'text-slate-500'} />
                <Text numberOfLines={1} className={tw('px-1 text-[11px]', active ? 'text-accent-300 light:text-accent-700' : 'text-slate-500')}>{n.label}</Text>
              </Pressable>
            )
          })}
          <Pressable onPress={() => setMoreOpen(true)} className="flex-1 items-center gap-1 py-3">
            <Icon as={MoreHorizontal} size={18} className={isMoreActive ? 'text-accent-300 light:text-accent-700' : 'text-slate-500'} />
            <Text className={tw('text-[11px]', isMoreActive ? 'text-accent-300 light:text-accent-700' : 'text-slate-500')}>More</Text>
          </Pressable>
        </View>
      </View>

      <BottomSheet open={moreOpen} onOpenChange={setMoreOpen} title="More">
        <View className="flex-row flex-wrap gap-3 pb-4">
          {morePanelItems.map((n) => {
            const active = view === n.key
            return (
              <Pressable key={n.key} onPress={() => { setMoreOpen(false); setView(n.key) }} style={{ width: '31%' }}
                className={tw('items-center gap-2 rounded-xl border p-4 glassy:glass-pill', active ? 'border-accent-300/30 bg-accent-400/10' : 'border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03]')}>
                <Icon as={n.icon} size={20} className={active ? 'text-accent-200 light:text-accent-700' : 'text-slate-300 light:text-slate-700'} />
                <Text numberOfLines={2} className={tw('text-center text-xs', active ? 'text-accent-200 light:text-accent-700' : 'text-slate-300 light:text-slate-700')}>{n.label}</Text>
              </Pressable>
            )
          })}
        </View>
      </BottomSheet>

      <AccountForm open={accountForm.open} editing={accountForm.editing} accounts={data.accounts} onClose={() => setAccountForm({ open: false, editing: null })} onSaved={async () => { setAccountForm({ open: false, editing: null }); await refresh() }} />
      <CreditCardForm open={cardForm.open} editing={cardForm.editing} onClose={() => setCardForm({ open: false, editing: null })} onSaved={async () => { setCardForm({ open: false, editing: null }); await refresh() }} />
      <RecurringManager open={recurringOpen} onClose={() => setRecurringOpen(false)} data={data} refresh={refresh} showMoney={showMoney} />
      <CsvImport open={csvOpen} onClose={() => setCsvOpen(false)} data={data} refresh={refresh} />
      <LoanForm open={loanForm.open} editing={loanForm.editing} accounts={dropdownAccounts} onClose={() => setLoanForm({ open: false, editing: null })} onSaved={async () => { setLoanForm({ open: false, editing: null }); await refresh() }} />
      <LoanPaymentForm open={!!loanPay} loan={loanPay} accounts={dropdownAccounts} creditCards={data.credit_cards || []} payments={(data.loan_payments || []).filter((p) => p.loan_id === loanPay?.id)} onClose={() => setLoanPay(null)} onSaved={async () => { setLoanPay(null); await refresh() }} />
      <LendForm open={lendForm.open} editing={lendForm.editing} accounts={dropdownAccounts} creditCards={data.credit_cards} onClose={() => setLendForm({ open: false, editing: null })} onSaved={async () => { setLendForm({ open: false, editing: null }); await refresh() }} />
      <LendAddMoreForm open={!!lendAddRecord} record={lendAddRecord} accounts={dropdownAccounts} creditCards={data.credit_cards} onClose={() => setLendAddRecord(null)} onSaved={async () => { setLendAddRecord(null); await refresh() }} />
      <ManageAccessSheet open={!!shareSheet} kind={shareSheet?.kind || 'lend'} target={shareSheet?.target} onClose={() => setShareSheet(null)} />
      {prompt.node}
      <BucketForm open={bucketForm.open} editing={bucketForm.editing} onClose={() => setBucketForm({ open: false, editing: null })} onSaved={async () => { setBucketForm({ open: false, editing: null }); await refresh() }} />
      <ChitFundForm open={chitForm.open} editing={chitForm.editing} accounts={dropdownAccounts} onClose={() => setChitForm({ open: false, editing: null })} onSaved={async () => { setChitForm({ open: false, editing: null }); await refresh() }} />
      <ChitFundPaymentForm open={!!chitPayment} fund={chitPayment?.fund} editing={chitPayment?.editing} accounts={dropdownAccounts} onClose={() => setChitPayment(null)} onSaved={async () => { setChitPayment(null); await refresh() }} />
      <ChitFundPayoutForm open={!!chitPayout} fund={chitPayout} accounts={dropdownAccounts} onClose={() => setChitPayout(null)} onSaved={async () => { setChitPayout(null); await refresh() }} />
      <TypeToConfirm state={typeConfirm} onClose={async (ok) => { const s = typeConfirm; setTypeConfirm(null); if (ok) await s.run() }} />
    </View>
  )
}
