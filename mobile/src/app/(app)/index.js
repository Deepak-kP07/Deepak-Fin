import { useEffect, useMemo, useRef, useState } from 'react'
import { AppState, BackHandler, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as SecureStore from 'expo-secure-store'
import { Bell, Eye, EyeOff, Link2, MoreHorizontal, Plus, Settings } from 'lucide-react-native'
import { Icon } from '../../ui/Icon'
import { Avatar } from '../../ui/Avatar'
import { AccentGradient } from '../../ui/Gradient'
import { BottomSheet } from '../../ui/BottomSheet'
import { LoadError, LoadingSkeleton, RefreshErrorBanner } from '../../ui/LoadState'
import { measureView, SpotlightTour } from '../../ui/SpotlightTour'
import { TOUR_STEPS } from '../../lib/tourSteps'
import { useTheme } from '../../state/ThemeProvider'
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
import { InsightsView } from '../../views/InsightsView'
import { CardPayForm, NotificationsSheet } from '../../views/forms/ShellSheets'
import { dueScheduledOf, ScheduledDuePrompt } from '../../views/forms/ScheduledDuePrompt'
import { useHiddenTx } from '../../state/HiddenTx'
import { InvestmentsView } from '../../views/InvestmentsView'
import { HoldingForm, HoldingsBulkImport, OtherInvestmentForm, PortfolioForm, PortfolioFundsForm, SipForm } from '../../views/forms/InvestmentForms'
import * as WebBrowser from 'expo-web-browser'
import { FamilyCompanyView } from '../../views/FamilyCompanyView'
import { MoneyProfileBulkImport, MoneyProfileEntryForm, MoneyProfileForm, RecurringEntryManager } from '../../views/forms/FamilyForms'
import { BudgetForm, BudgetMonthForm, BudgetsView } from '../../views/BudgetsView'
import { ScholarshipForm, ScholarshipPayForm, ScholarshipsView } from '../../views/ScholarshipsView'
import { ChitFundForm, ChitFundPaymentForm, ChitFundPayoutForm } from '../../views/forms/ChitFundForms'
import { AccountForm } from '../../views/forms/AccountForm'
import { CreditCardForm, CsvImport, RecurringManager } from '../../views/forms/MiscForms'
import { tw } from '../../lib/tw'
import { useAuth } from '../../state/AuthProvider'
import { useData } from '../../state/DataProvider'
import { categoriesFor, orderedEnabledKeys, resolveDashboardWidgets, resolveMobileNavSlots, resolveModuleSettings } from '../../lib/shared'
import { MOBILE_MANDATORY_META, NAV_META } from '../../lib/navMeta'
import { api } from '../../lib/api'
import { useAppLock } from '../../ui/AppLock'
import { PermissionsOnboarding, permissionsOnboardingSteps } from '../../ui/PermissionsOnboarding'
import { dialog } from '../../ui/Dialogs'

// Native port of the PWA's Shell (app/page.js): one screen whose `view` switches what's shown,
// the Dashboard header, the configurable 3-slot bottom nav + "More" sheet, and the floating
// quick-add button.
// Last screen (view, Settings section, open detail) — restored on the next launch, like the PWA's
// localStorage 'financeNavState'.
const NAV_STATE_KEY = 'nav_state'
const RESTORABLE_VIEWS = ['dashboard', 'networth', 'transactions', 'accounts', 'cards', 'loans', 'lend', 'chitfunds', 'investments', 'insights', 'family_company', 'budgets', 'scholarships', 'bucket', 'profile']

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
  const { data, refresh, patch, loading, loaded, error: loadError } = useData()
  const { accentColor, theme } = useTheme()
  const [pulling, setPulling] = useState(false)
  // First-login tour (or a replay from Settings → User guide) — spotlights the bottom-nav item or
  // Settings section picker each step is about, measured through these refs.
  const [forceTour, setForceTour] = useState(false)
  const navRefs = useRef({})
  const settingsPickerRef = useRef(null)
  const [view, setViewRaw] = useState('dashboard')
  // Leaving a view clears its open detail in the same update, so a view mounting straight into a
  // detail (a restored screen) can report it without a parent effect wiping it afterwards.
  const setViewState = (key) => { setActiveDetailId(null); setViewRaw(key) }
  const [settingsSection, setSettingsSection] = useState('profile')
  const [moreOpen, setMoreOpen] = useState(false)
  const [showMoney, setShowMoney] = useState(true)
  const [hasGreetedOnce, setHasGreetedOnce] = useState(false)
  const [unread, setUnread] = useState(0)
  const [activeDetailId, setActiveDetailId] = useState(null)
  const [detailResetNonce, setDetailResetNonce] = useState(0)
  const [payCard, setPayCard] = useState(null)
  const [notifOpen, setNotifOpen] = useState(false)
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
  const [scholarshipForm, setScholarshipForm] = useState({ open: false, editing: null })
  const [scholarshipPay, setScholarshipPay] = useState(null)
  const [budgetMonthForm, setBudgetMonthForm] = useState(null) // { year, month }
  const [budgetForm, setBudgetForm] = useState({ open: false, editing: null })
  const [profileForm, setProfileForm] = useState({ open: false, editing: null })
  const [entryForm, setEntryForm] = useState(null) // { profileId, editing }
  const [bulkImportProfile, setBulkImportProfile] = useState(null)
  const [recurringProfileId, setRecurringProfileId] = useState(null)
  const [portfolioForm, setPortfolioForm] = useState({ open: false, editing: null })
  const [holdingForm, setHoldingForm] = useState(null) // { editing, portfolioId }
  const [fundsForm, setFundsForm] = useState(null) // { portfolio, mode }
  const [sipForm, setSipForm] = useState({ open: false, editing: null })
  const [otherInvForm, setOtherInvForm] = useState(null) // { editing, portfolioId }
  const [holdingsImport, setHoldingsImport] = useState(null)
  const [pricesLoading, setPricesLoading] = useState(false)
  const [kiteSyncBusy, setKiteSyncBusy] = useState(false)
  // First sign-in on this phone: the permissions screen (notifications, fingerprint lock) comes
  // first, then the tour — never stacked, and never over the lock screen.
  const { locked, ready: lockReady } = useAppLock()
  const [onboardSteps, setOnboardSteps] = useState(null) // null while checking
  useEffect(() => {
    if (!loaded || !data.profile) return
    permissionsOnboardingSteps().then(setOnboardSteps, () => setOnboardSteps([]))
  }, [loaded, !!data.profile])
  const onboarded = Array.isArray(onboardSteps) && onboardSteps.length === 0
  const unlocked = lockReady && !locked
  // Scheduled transactions that are due: the prompt opens by itself once per app open (not over
  // the first-run tour), and again from the Transactions badge — same as the PWA Shell.
  const { revealed: hiddenRevealed } = useHiddenTx()
  const dueScheduled = useMemo(() => dueScheduledOf(data.scheduled_transactions, hiddenRevealed), [data.scheduled_transactions, hiddenRevealed])
  const [duePromptOpen, setDuePromptOpen] = useState(false)
  const duePromptShown = useRef(false)
  useEffect(() => {
    if (loading || duePromptShown.current || dueScheduled.length === 0 || !data.profile?.tour_completed_at || !onboarded || !unlocked) return
    duePromptShown.current = true
    setDuePromptOpen(true)
  }, [loading, dueScheduled.length, data.profile?.tour_completed_at, onboarded, unlocked])
  // "/?view=loans" (a notification tap, or the notifications list) opens that module.
  // Restore the last screen once — unless this launch came from a link/notification that names a
  // view, which wins. `restoreDetail` is handed to that view as initialSelectedId, then dropped.
  const [restoreDetail, setRestoreDetail] = useState(null)
  const navRestored = useRef(false)
  useEffect(() => {
    let alive = true
    SecureStore.getItemAsync(NAV_STATE_KEY).then((raw) => {
      if (!alive || navRestored.current) return
      navRestored.current = true
      if (viewParam) return
      let saved = null
      try { saved = JSON.parse(raw || 'null') } catch { saved = null }
      if (!saved || !RESTORABLE_VIEWS.includes(saved.view)) return
      if (saved.section) setSettingsSection(saved.section)
      if (saved.detailId) setRestoreDetail({ view: saved.view, id: saved.detailId })
      setViewState(saved.view)
    }).catch(() => { navRestored.current = true })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!navRestored.current) return
    SecureStore.setItemAsync(NAV_STATE_KEY, JSON.stringify({ view, section: settingsSection, detailId: activeDetailId || null })).catch(() => {})
  }, [view, settingsSection, activeDetailId])
  useEffect(() => { if (restoreDetail && view !== restoreDetail.view) setRestoreDetail(null) }, [view, restoreDetail])
  const initialSelectedId = restoreDetail?.view === view ? restoreDetail.id : undefined
  // "/?view=profile&section=money_rules" also picks the Settings section.
  // "/?tour=1" (or tour=<step>) replays the first-run tour (same as Settings → User guide → Replay tour).
  const { view: viewParam, section: sectionParam, tour: tourParam } = useLocalSearchParams()
  useEffect(() => { if (viewParam) { if (sectionParam) setSettingsSection(String(sectionParam)); setView(String(viewParam)) } }, [viewParam, sectionParam])
  useEffect(() => { if (tourParam) setForceTour(Math.max(1, Number(tourParam) || 1)) }, [tourParam])

  useEffect(() => { const t = setTimeout(() => setHasGreetedOnce(true), 2200); return () => clearTimeout(t) }, [])
  // Unread count for the bell: after every data load, every 2 minutes while the app is open, and
  // whenever it comes back to the foreground (same cadence as the PWA's useNotifications).
  useEffect(() => { api('/finance/notifications').then((r) => setUnread(r.unread || 0)).catch(() => {}) }, [data])
  useEffect(() => {
    const check = () => { if (AppState.currentState === 'active') api('/finance/notifications').then((r) => setUnread(r.unread || 0)).catch(() => {}) }
    const timer = setInterval(check, 120000)
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') check() })
    return () => { clearInterval(timer); sub.remove() }
  }, [])
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (moreOpen) { setMoreOpen(false); return true }
      // Inside a module's detail screen (an account, loan, profile…), back returns to that module's
      // list — remounting the view resets its selection, same as its own "Back to …" link.
      if (activeDetailId) { setRestoreDetail(null); setDetailResetNonce((n) => n + 1); return true }
      if (view === 'networth') { setViewState('dashboard'); return true }
      if (view !== 'dashboard') { setViewState('dashboard'); return true }
      return false
    })
    return () => sub.remove()
  }, [view, moreOpen, activeDetailId])

  const setView = (key) => {
    if (key === 'credit_cards') key = 'cards'
    setViewState(key)
  }
  const openTxForm = (params) => router.push(params ? { pathname: '/transaction', params } : '/transaction')
  const editTx = (t) => router.push({ pathname: '/transaction', params: { id: t.id } })
  const confirmDelete = (title, message, run) => dialog.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: run }])

  const runFabAction = () => {
    if (view === 'accounts') return activeDetailId ? openTxForm({ source: activeDetailId }) : setAccountForm({ open: true, editing: null })
    if (view === 'cards') return activeDetailId ? openTxForm({ source: `cc:${activeDetailId}` }) : setCardForm({ open: true, editing: null })
    if (view === 'lend') { const r = data.lend_borrow.find((l) => l.id === activeDetailId); return r ? logLendRepayment(r) : setLendForm({ open: true, editing: null }) }
    if (view === 'chitfunds') { const f = data.chit_funds.find((c) => c.id === activeDetailId); return f ? setChitPayment({ fund: f, editing: null }) : setChitForm({ open: true, editing: null }) }
    if (view === 'investments') return setHoldingForm({ editing: null, portfolioId: activeDetailId || '' })
    if (view === 'family_company') return activeDetailId ? setEntryForm({ profileId: activeDetailId, editing: null }) : setProfileForm({ open: true, editing: null })
    if (view === 'budgets') { const n = new Date(); const next = new Date(n.getFullYear(), n.getMonth() + 1, 1); return setBudgetMonthForm({ year: next.getFullYear(), month: next.getMonth() }) }
    if (view === 'scholarships') { const sc = data.scholarships.find((x) => x.id === activeDetailId); return sc ? setScholarshipPay(sc) : setScholarshipForm({ open: true, editing: null }) }
    if (view === 'bucket') return setBucketForm({ open: true, editing: null })
    if (view === 'loans') { const loan = data.loans.find((l) => l.id === activeDetailId); return loan ? setLoanPay(loan) : setLoanForm({ open: true, editing: null }) }
    return openTxForm()
  }
  // Profile settings (theme, accent, modules, nav, widgets, tour…) apply on the tap; the server
  // save and the refresh follow in the background, and a failure puts the server's value back.
  const saveProfile = async (body) => {
    patch((d) => ({ profile: d.profile ? { ...d.profile, ...body } : d.profile }))
    try { await api('/finance/profile', { method: 'PATCH', body }); refresh() } catch (e) { dialog.alert('Could not save', e.message); refresh() }
  }
  // Drop deleted transactions from the screen at once (both legs of a transfer); refresh follows.
  const dropTxLocally = (ids) => patch((d) => {
    const all = [...d.transactions, ...(d.scheduled_transactions || [])]
    const groups = new Set(all.filter((t) => ids.includes(t.id) && t.transfer_group_id).map((t) => t.transfer_group_id))
    const keep = (t) => !ids.includes(t.id) && !(t.transfer_group_id && groups.has(t.transfer_group_id))
    return { transactions: d.transactions.filter(keep), scheduled_transactions: (d.scheduled_transactions || []).filter(keep) }
  })
  const deleteTxBulk = (ids) => new Promise((resolve) => {
    const n = ids.length
    if (n === 0) return resolve(false)
    dialog.alert(`Delete ${n} transaction${n === 1 ? '' : 's'}?`, 'Account balances are restored.', [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const all = [...data.transactions, ...(data.scheduled_transactions || [])]
        const seen = new Set()
        const targets = ids.filter((id) => { const t = all.find((x) => x.id === id); if (!t?.transfer_group_id) return true; if (seen.has(t.transfer_group_id)) return false; seen.add(t.transfer_group_id); return true })
        dropTxLocally(targets)
        const results = await Promise.all(targets.map((id) => api(`/finance/transactions/${id}`, { method: 'DELETE' }).then(() => true, () => false)))
        refresh()
        const failed = results.filter((ok) => !ok).length
        if (failed) dialog.alert('Some deletes failed', `${targets.length - failed} of ${targets.length} deleted.`)
        else toast.push(`${n} transaction${n === 1 ? '' : 's'} deleted`)
        resolve(true)
      } },
    ])
  })
  const deleteCardActivityBulk = (rows) => new Promise((resolve) => {
    const n = rows.length
    if (n === 0) return resolve(false)
    dialog.alert(`Delete ${n} ${n === 1 ? 'entry' : 'entries'}?`, 'Card outstanding will be recomputed.', [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const results = await Promise.all(rows.map((a) => api(a.source === 'log' ? `/finance/credit_card_transactions/${a.row.id}` : `/finance/transactions/${a.row.id}`, { method: 'DELETE' }).then(() => true, () => false)))
        await refresh()
        const failed = results.filter((ok) => !ok).length
        if (failed) dialog.alert('Some deletes failed', `${n - failed} of ${n} deleted.`)
        else toast.push(`${n} ${n === 1 ? 'entry' : 'entries'} deleted`)
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
    dialog.alert(`Reverse ${n} payment${n === 1 ? '' : 's'}?`, 'The linked transactions and outstanding will restore.', [
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
  const deleteTx = (t) => confirmDelete('Delete this transaction?', 'Balances will be recomputed.', async () => { dropTxLocally([t.id]); try { await api(`/finance/transactions/${t.id}`, { method: 'DELETE' }); toast.push('Transaction deleted') } catch (e) { toast.push(e.message, 'error') } refresh() })
  const editAdditionNote = async (a) => {
    const value = await prompt.ask('Note for this top-up', { defaultValue: a.notes || '', placeholder: 'e.g. Diwali advance' })
    if (value === null) return
    try { await api(`/finance/lend_borrow_additions/${a.id}`, { method: 'PATCH', body: { notes: value.trim() } }); toast.push('Note updated'); await refresh() } catch { toast.push('Could not update', 'error') }
  }
  // Chit funds — take_payout/undo_payout/complete/reopen are dedicated action endpoints.
  const chitAction = async (fund, action, done) => { try { await api(`/finance/chit_funds/${fund.id}/${action}`, { method: 'POST' }); toast.push(done); await refresh() } catch (e) { toast.push(e.message, 'error') } }
  const deleteChitFund = (c, after) => confirmDelete(`Delete chit fund "${c.name}"?`, 'All payment records and any linked transactions will be removed.', async () => { try { await api(`/finance/chit_funds/${c.id}`, { method: 'DELETE' }); after?.(); toast.push('Chit fund deleted'); await refresh() } catch { toast.push('Delete failed', 'error') } })
  const deleteChitPaymentNow = async (id) => { try { await api(`/finance/chit_fund_payments/${id}`, { method: 'DELETE' }); return true } catch { return false } }
  // Bulk: one confirm (asked by the view), sequential deletes, one refresh and one summary at the end.
  const deleteChitFundPaymentBulk = async (ids) => {
    let failed = 0
    for (const id of ids) { if (!(await deleteChitPaymentNow(id))) failed++ }
    await refresh()
    const n = ids.length
    toast.push(failed > 0 ? `${n - failed} of ${n} payments deleted — ${failed} failed` : `${n} payment${n === 1 ? '' : 's'} deleted`, failed > 0 ? 'error' : undefined)
  }
  const deleteChitFundPayment = async (id, silent) => {
    if (silent) { const ok = await deleteChitPaymentNow(id); await refresh(); if (!ok) toast.push('Delete failed', 'error'); return }
    confirmDelete('Delete this payment?', 'Its linked transaction (if any) will be removed too.', async () => { const ok = await deleteChitPaymentNow(id); toast.push(ok ? 'Payment deleted' : 'Delete failed', ok ? undefined : 'error'); await refresh() })
  }
  // Budgets — close/reopen are dedicated endpoints so they can't race a /budget_months/save.
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const closeBudgetMonth = (plan) => dialog.alert(`Close ${MONTHS[plan.month]} ${plan.year}'s budget?`, 'It moves into your history log — you can still reopen it later.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Close month', onPress: async () => { try { await api(`/finance/budget_months/${plan.id}/close`, { method: 'POST' }); toast.push('Month closed'); await refresh() } catch { toast.push('Could not close', 'error') } } }])
  const reopenBudgetMonth = async (plan) => { try { await api(`/finance/budget_months/${plan.id}/reopen`, { method: 'POST' }); toast.push('Month reopened'); await refresh() } catch { toast.push('Could not reopen', 'error') } }
  const deleteBudgetMonth = (plan, after) => confirmDelete(`Delete ${MONTHS[plan.month]} ${plan.year}'s budget?`, "This can't be undone.", async () => { try { await api(`/finance/budget_months/${plan.id}`, { method: 'DELETE' }); after?.(); toast.push('Budget deleted'); await refresh() } catch (e) { toast.push(e.message, 'error') } })
  const deleteYearlyBudget = (b) => confirmDelete('Delete this yearly budget?', '', async () => { try { await api(`/finance/budgets/${b.id}`, { method: 'DELETE' }); toast.push('Budget deleted'); await refresh() } catch (e) { toast.push(e.message, 'error') } })
  // Family / Company
  const deleteMoneyProfile = (p, after) => confirmDelete(`Delete profile "${p.name}"?`, 'Its entries will be removed too. Any transactions already mirrored into your accounts (for a linked profile) are left as-is — they really happened.', async () => { try { await api(`/finance/money_profiles/${p.id}`, { method: 'DELETE' }); after?.(); toast.push('Profile deleted'); await refresh() } catch (e) { toast.push(e.message, 'error') } })
  const deleteMoneyProfileEntryBulk = (ids) => new Promise((resolve) => {
    const n = ids.length
    if (n === 0) return resolve(false)
    dialog.alert(`Delete ${n} entr${n === 1 ? 'y' : 'ies'}?`, '', [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const results = await Promise.all(ids.map((id) => api(`/finance/money_profile_entries/${id}`, { method: 'DELETE' }).then(() => true, () => false)))
        const failed = results.filter((ok) => !ok).length
        await refresh()
        toast.push(failed > 0 ? `${n - failed} of ${n} entries deleted — ${failed} failed` : `${n} entr${n === 1 ? 'y' : 'ies'} deleted`, failed > 0 ? 'error' : undefined)
        resolve(true)
      } },
    ])
  })
  const toggleMoneyProfileStatus = async (p) => { const next = p.status === 'closed' ? 'active' : 'closed'; try { await api(`/finance/money_profiles/${p.id}`, { method: 'PATCH', body: { status: next } }); toast.push(next === 'closed' ? 'Profile closed' : 'Profile reactivated'); await refresh() } catch (e) { toast.push(e.message, 'error') } }
  const syncMoneyProfileBalance = async (p, target) => { try { await api(`/finance/money_profiles/${p.id}/sync_balance`, { method: 'POST', body: { target_balance: target } }); toast.push('Balance synced'); await refresh() } catch (e) { toast.push(e.message || 'Sync failed', 'error') } }
  const toggleRecurringEntry = async (r) => { try { await api(`/finance/recurring_money_profile_entries/${r.id}`, { method: 'PATCH', body: { is_active: !r.is_active } }); await refresh() } catch { toast.push('Update failed', 'error') } }
  const deleteRecurringEntry = (r) => dialog.alert(`Stop "${r.description}"?`, 'Past entries it already created stay put.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Stop', style: 'destructive', onPress: async () => { try { await api(`/finance/recurring_money_profile_entries/${r.id}`, { method: 'DELETE' }); toast.push('Recurring rule removed'); await refresh() } catch { toast.push('Delete failed', 'error') } } }])
  const entryProfile = entryForm ? data.money_profiles.find((p) => p.id === entryForm.profileId) : null
  const recurringProfile = data.money_profiles.find((p) => p.id === recurringProfileId)
  // Investments
  const delRow = (table, title, msg, done, after) => confirmDelete(title, msg, async () => { try { await api(`/finance/${table}`, { method: 'DELETE' }); after?.(); toast.push(done); await refresh() } catch (e) { toast.push(e.message, 'error') } })
  const deletePortfolio = (p, after) => delRow(`portfolios/${p.id}`, `Delete portfolio "${p.name}"?`, 'Its holdings and other investments will be removed too — SIPs will just be unlinked, not deleted.', 'Portfolio deleted', after)
  const refreshAllPrices = async () => {
    if (data.holdings.length === 0) return
    setPricesLoading(true)
    try {
      const result = await api('/finance/prices', { method: 'POST', body: { symbols: data.holdings.map((h) => ({ symbol: h.symbol, exchange: h.exchange })) }, timeoutMs: 90000 })
      const updated = Object.keys(result.prices || {}).length
      toast.push(`Refreshed ${updated} price${updated === 1 ? '' : 's'}${result.kite_active ? ' via Kite live' : ' via Yahoo'}`)
      await refresh()
    } catch { toast.push('Price fetch failed', 'error') } finally { setPricesLoading(false) }
  }
  const refreshRowPrice = async (h) => {
    try {
      const result = await api('/finance/prices', { method: 'POST', body: { symbols: [{ symbol: h.symbol, exchange: h.exchange }] } })
      if (result.prices?.[h.symbol]) { toast.push(`${h.symbol} refreshed via ${result.kite_active ? 'Kite live' : 'Yahoo'}`); await refresh() } else toast.push(`No live price found for ${h.symbol}`, 'error')
    } catch { toast.push('Price fetch failed', 'error') }
  }
  const manualPriceEntry = async (h) => {
    const price = await prompt.ask(`Update current price for ${h.symbol}`, { defaultValue: String(h.current_price || h.avg_buy_price || '') })
    if (!price || !Number.isFinite(Number(price))) return
    try { await api(`/finance/holdings/${h.id}`, { method: 'PATCH', body: { current_price: Number(price), last_price_updated_at: new Date().toISOString() } }); toast.push(`${h.symbol} updated`); await refresh() } catch (e) { toast.push(e.message, 'error') }
  }
  // Kite's own login page opens in an in-app browser tab; the server hands back a signed one-time
  // state so the callback knows who's connecting, then redirects to personalfin://kite, which
  // closes the tab and lands back here.
  const connectKite = async () => {
    const go = await dialog.confirm({ title: 'Connect Zerodha Kite', message: "You'll sign in on Zerodha's own login page — Personal Fin never sees your Kite password. Holdings, mutual funds and orders sync once you're back.", confirmLabel: 'Continue', icon: Link2 })
    if (!go) return
    try {
      const { url } = await api('/kite/login_url', { method: 'POST' })
      const res = await WebBrowser.openAuthSessionAsync(url, 'personalfin://kite')
      if (res.type !== 'success') return
      const q = new URL(res.url).searchParams
      if (q.get('status') === 'ok') { toast.push('Kite connected — your holdings are syncing'); await refresh() }
      else toast.push(q.get('message') || 'Kite connection failed — try again.', 'error')
    } catch (e) { toast.push(e.message || 'Could not start the Kite login', 'error') }
  }
  const kiteCall = async (path, done) => {
    setKiteSyncBusy(true)
    try { const r = await api(path, { method: 'POST', timeoutMs: 120000 }); toast.push(done(r)); await refresh() } catch (e) { toast.push(e.message || 'Sync failed', 'error'); await refresh() } finally { setKiteSyncBusy(false) }
  }
  const linkPortfolioKite = (p) => kiteCall(`/finance/portfolios/${p.id}/link_kite`, (r) => `Linked · ${r.added} holding${r.added === 1 ? '' : 's'} synced from Kite`)
  const syncPortfolioKite = (p) => kiteCall(`/finance/portfolios/${p.id}/sync_kite`, (r) => `Synced · ${r.added} added, ${r.updated} updated, ${r.removed} removed`)
  const syncSipsKite = () => kiteCall('/finance/sips/sync_kite', (r) => `Mutual funds synced · ${r.added} added, ${r.updated} updated, ${r.removed} removed`)
  const unlinkPortfolioKite = (p) => dialog.alert(`Unlink "${p.name}" from Kite?`, "Its holdings stay, but you'll manage them manually from here on.", [{ text: 'Cancel', style: 'cancel' }, { text: 'Unlink', style: 'destructive', onPress: async () => { try { await api(`/finance/portfolios/${p.id}/unlink_kite`, { method: 'POST' }); toast.push('Unlinked from Kite'); await refresh() } catch { toast.push('Unlink failed', 'error') } } }])
  const savedThen = (close) => async () => { close(); await refresh() }
  const dropdownAccounts = data.accounts.filter((a) => a.is_active !== false)
  const toggleIncludeInNetWorth = async (table, row) => { try { await api(`/finance/${table}/${row.id}`, { method: 'PATCH', body: { include_in_net_worth: row.include_in_net_worth === false } }); await refresh() } catch { dialog.alert('Update failed') } }
  const toggleIncludeInNetWorthGroup = async (table, rows, next) => { try { await Promise.all(rows.map((r) => api(`/finance/${table}/${r.id}`, { method: 'PATCH', body: { include_in_net_worth: next } }))); await refresh() } catch { dialog.alert('Update failed') } }
  const deleteUserAccount = () => setTypeConfirm({
    title: 'Delete your Personal Fin account?', message: 'Your login, every record, and every uploaded file will be permanently erased. This cannot be undone. Type DELETE to confirm.', confirmLabel: 'Delete account',
    run: async () => { try { await api('/account/delete', { method: 'POST', body: { confirm: 'DELETE' }, timeoutMs: 120000 }); await signOut(); dialog.alert('Your account has been deleted') } catch (e) { dialog.alert('Could not delete your account', e.message) } },
  })
  const clearAllData = () => setTypeConfirm({
    title: 'Clear all data?', message: 'Permanently delete every account, transaction, and record you have across the app? Your login stays. Type DELETE to confirm.', confirmLabel: 'Delete everything',
    run: async () => { try { await api('/account/clear_data', { method: 'POST', timeoutMs: 120000 }); await refresh(); dialog.alert('All your data has been deleted') } catch { dialog.alert('Could not clear your data') } },
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
  const tourOpen = loaded && !!profile && onboarded && unlocked && (!profile.tour_completed_at || forceTour)
  // A module in the bottom nav is spotlit there; one that lives in the More sheet opens the sheet
  // and spotlights its tile (Settings is always in More).
  const inPrimaryNav = (key) => mobileNavSlots.includes(key)
  const tourContext = {
    setView: (key) => { if (key === 'profile') setSettingsSection('profile'); setView(key); setMoreOpen(!inPrimaryNav(key)) },
    openSettings: (section) => { setMoreOpen(false); setSettingsSection(section); setView('profile') },
  }
  const tourTarget = (step) => {
    if (step.target === 'settings') return measureView(settingsPickerRef.current)
    if (step.target?.startsWith('nav:')) {
      const key = step.target.slice(4) === 'credit_cards' ? 'cards' : step.target.slice(4)
      return measureView(inPrimaryNav(key) ? navRefs.current[key] : navRefs.current[`more:${key}`] || navRefs.current.more)
    }
    return Promise.resolve(null)
  }
  const closeTour = () => { setForceTour(false); setMoreOpen(false); saveProfile({ tour_completed_at: new Date().toISOString() }) }
  const pullRefresh = async () => { setPulling(true); try { await refresh() } finally { setPulling(false) } }
  // Before the first successful load there's nothing real to show: a skeleton while loading, a
  // retry screen if it failed. After that, a failed refresh keeps the last data with a banner.
  const gate = !loaded ? (loading ? <LoadingSkeleton /> : loadError ? <LoadError message={loadError} onRetry={pullRefresh} retrying={pulling} /> : null) : null
  const page = (children, header = null) => (
    <ScrollView key={`${view}-${detailResetNonce}`} contentContainerStyle={{ paddingTop: Math.max(24, insets.top + 24), paddingBottom: 96 + insets.bottom }} className="px-5" keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={pulling} onRefresh={pullRefresh} colors={[accentColor(300)]} tintColor={accentColor(300)} progressBackgroundColor={theme === 'light' ? '#ffffff' : '#141a28'} />}>
      {header}
      {loaded && loadError ? <RefreshErrorBanner onRetry={pullRefresh} retrying={pulling} /> : null}
      {gate || children}
    </ScrollView>
  )

  return (
    <View className="flex-1">
      {view === 'dashboard' && page(
        <DashboardView data={data} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onOpenTxForm={() => openTxForm()} setView={setView}
          onManageMoneyRules={() => { setSettingsSection('money_rules'); setView('profile') }} onPayCardBill={setPayCard}
          onOpenNetWorthDetail={() => setView('networth')} />,
        <View className="mb-6 flex-row items-center justify-between">
            <Pressable onPress={() => { setSettingsSection('profile'); setView('profile') }} className="-m-1 min-w-0 flex-1 flex-row items-center gap-2.5 rounded-xl p-1">
              <Avatar src={avatarUrl} name={firstName} email={user?.email} size={38} />
              <Text numberOfLines={1} className={tw('min-w-0 flex-1 text-lg font-semibold text-white light:text-slate-900')}>
                {hasGreetedOnce ? `${firstName} 👋` : <><Text className={tw('font-normal text-slate-400 light:text-slate-500')}>Welcome back,</Text> {firstName} 👋</>}
              </Text>
            </Pressable>
            <View className="flex-row items-center gap-2">
            {/* The Net worth card carries its own eye toggle; when that widget is turned off, this
                fallback keeps hiding amounts reachable (same as the PWA header). */}
            {!resolveDashboardWidgets(profile).net_worth?.enabled && (
              <Pressable onPress={() => setShowMoney((v) => !v)} accessibilityLabel={showMoney ? 'Hide amounts' : 'Show amounts'} className={tw('rounded-xl border border-white/10 light:border-black/10 p-2.5')}>
                <Icon as={showMoney ? Eye : EyeOff} size={16} className="text-slate-400 light:text-slate-500" />
              </Pressable>
            )}
            <Pressable onPress={() => setNotifOpen(true)} className={tw('relative rounded-xl border border-white/10 light:border-black/10 p-2.5')}>
              <Icon as={Bell} size={16} className="text-slate-400 light:text-slate-500" />
              {unread > 0 && <View className="absolute -right-1.5 -top-1.5 h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1"><Text className="text-[10px] font-semibold text-white">{unread > 9 ? '9+' : unread}</Text></View>}
            </Pressable>
            </View>
        </View>,
      )}
      {view === 'networth' && page(<NetWorthDetailView data={data} showMoney={showMoney} onBack={() => setView('dashboard')} setView={setView} onToggle={toggleIncludeInNetWorth} onToggleGroup={toggleIncludeInNetWorthGroup} />)}
      {view === 'transactions' && page(
        <TransactionsView data={data} scheduledDueCount={dueScheduled.length} onOpenScheduledPrompt={() => setDuePromptOpen(true)} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onOpenTxForm={() => openTxForm()} onEditTx={editTx} onDeleteTxBulk={deleteTxBulk}
          onPayCardBill={setPayCard} onImport={() => setCsvOpen(true)} onOpenRecurring={() => setRecurringOpen(true)} />,
      )}
      {view === 'accounts' && page(
        <AccountsView data={data} initialSelectedId={initialSelectedId} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onDetailChange={setActiveDetailId} onEditTx={editTx} onDeleteTxBulk={deleteTxBulk}
          onEdit={(a) => setAccountForm({ open: true, editing: a })}
          onDelete={(a, after) => confirmDelete(`Delete "${a.name}"?`, 'Its transactions stay but lose the account link.', async () => { try { await api(`/finance/accounts/${a.id}`, { method: 'DELETE' }); after?.(); toast.push('Account deleted'); await refresh() } catch (e) { dialog.alert('Delete failed', e.message) } })}
          onSyncBalance={async (a, target) => { try { await api(`/finance/accounts/${a.id}/sync_balance`, { method: 'POST', body: { target_balance: target } }); toast.push('Balance synced'); await refresh() } catch (e) { dialog.alert('Sync failed', e.message) } }} />,
      )}
      {view === 'cards' && page(
        <CreditCardsView data={data} initialSelectedId={initialSelectedId} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onDetailChange={setActiveDetailId}
          onSpend={(card) => openTxForm({ source: `cc:${card.id}` })} onPay={setPayCard} onEditTx={editTx}
          onDeleteActivityBulk={deleteCardActivityBulk} onDeleteTxBulk={deleteTxBulk} onEdit={(c) => setCardForm({ open: true, editing: c })}
          onSyncOutstanding={async (card, target) => { try { await api(`/finance/credit_cards/${card.id}/sync_outstanding`, { method: 'POST', body: { target_outstanding: target } }); toast.push('Outstanding synced'); await refresh() } catch (e) { dialog.alert('Sync failed', e.message) } }}
          onDelete={(card, after) => confirmDelete(`Delete card "${card.name}"?`, 'All linked spends will be removed.', async () => { try { await api(`/finance/credit_cards/${card.id}`, { method: 'DELETE' }); after?.(); toast.push('Card deleted'); await refresh() } catch (e) { dialog.alert('Delete failed', e.message) } })} />,
      )}
      {view === 'loans' && page(
        <LoansView data={data} initialSelectedId={initialSelectedId} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onDetailChange={setActiveDetailId}
          onAdd={() => setLoanForm({ open: true, editing: null })} onEdit={(l) => setLoanForm({ open: true, editing: l })} onDelete={deleteLoan}
          onPay={setLoanPay} onDeletePayment={deleteLoanPayment} onDeletePaymentBulk={deleteLoanPaymentBulk} onSync={syncLoanOutstanding} />,
      )}
      {view === 'lend' && page(
        <LendBorrowView data={data} initialSelectedId={initialSelectedId} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onDetailChange={setActiveDetailId}
          onAdd={() => setLendForm({ open: true, editing: null })} onEdit={(l) => setLendForm({ open: true, editing: l })} onDelete={deleteLend} onDeleteTx={deleteTx} onDeleteTxBulk={deleteTxBulk}
          onLogRepayment={logLendRepayment} onAddMore={setLendAddRecord} onEditAdditionNote={editAdditionNote} onManageAccess={(r) => setShareSheet({ kind: 'lend', target: r })} />,
      )}
      {view === 'chitfunds' && page(
        <ChitFundsView data={data} initialSelectedId={initialSelectedId} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onDetailChange={setActiveDetailId}
          onAdd={() => setChitForm({ open: true, editing: null })} onEdit={(c) => setChitForm({ open: true, editing: c })} onDelete={deleteChitFund}
          onLogPayment={(fund) => setChitPayment({ fund, editing: null })} onEditPayment={(fund, editing) => setChitPayment({ fund, editing })} onTakePayout={setChitPayout}
          onUndoPayout={(fund) => dialog.alert('Undo this payout?', 'Its linked transaction (if any) will be removed.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Undo payout', style: 'destructive', onPress: () => chitAction(fund, 'undo_payout', 'Payout undone') }])}
          onComplete={(fund) => chitAction(fund, 'complete', 'Marked completed')} onReopen={(fund) => chitAction(fund, 'reopen', 'Reopened')} onDeletePayment={deleteChitFundPayment} onDeletePaymentBulk={deleteChitFundPaymentBulk} />,
      )}
      {view === 'investments' && page(
        <InvestmentsView data={data} initialSelectedId={initialSelectedId} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onDetailChange={setActiveDetailId}
          onAddPortfolio={() => setPortfolioForm({ open: true, editing: null })} onEditPortfolio={(p) => setPortfolioForm({ open: true, editing: p })} onDeletePortfolio={deletePortfolio}
          onAddHolding={(portfolioId = '') => setHoldingForm({ editing: null, portfolioId })} onEditHolding={(h) => setHoldingForm({ editing: h, portfolioId: h.portfolio_id })}
          onDeleteHolding={(h) => delRow(`holdings/${h.id}`, `Remove ${h.symbol}?`, '', 'Holding removed')} onBulkImport={setHoldingsImport}
          onRefreshRowPrice={refreshRowPrice} onManualPriceEntry={manualPriceEntry} onRefreshAll={refreshAllPrices} pricesLoading={pricesLoading}
          onAddFunds={(p) => setFundsForm({ portfolio: p, mode: 'add' })} onWithdrawFunds={(p) => setFundsForm({ portfolio: p, mode: 'withdraw' })}
          onConnectKite={connectKite} onLinkKite={linkPortfolioKite} onUnlinkKite={unlinkPortfolioKite} onSyncKite={syncPortfolioKite} kiteSyncBusy={kiteSyncBusy}
          onAddSip={() => setSipForm({ open: true, editing: null })} onEditSip={(x) => setSipForm({ open: true, editing: x })} onDeleteSip={(x) => delRow(`sips/${x.id}`, `Delete SIP "${x.fund_name}"?`, '', 'SIP deleted')} onSyncSipsKite={syncSipsKite}
          onAddOtherInvestment={(portfolioId) => setOtherInvForm({ editing: null, portfolioId })} onEditOtherInvestment={(o) => setOtherInvForm({ editing: o, portfolioId: o.portfolio_id })}
          onDeleteOtherInvestment={(o) => delRow(`other_investments/${o.id}`, `Remove "${o.name}"?`, '', 'Investment removed')} />,
      )}
      {view === 'insights' && page(<InsightsView data={data} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} />)}
      {view === 'family_company' && page(
        <FamilyCompanyView data={data} initialSelectedId={initialSelectedId} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onDetailChange={setActiveDetailId}
          onAddProfile={() => setProfileForm({ open: true, editing: null })} onEditProfile={(p) => setProfileForm({ open: true, editing: p })} onDeleteProfile={deleteMoneyProfile}
          onAddEntry={(profileId) => setEntryForm({ profileId, editing: null })} onEditEntry={(e) => setEntryForm({ profileId: e.profile_id, editing: e })} onDeleteEntryBulk={deleteMoneyProfileEntryBulk}
          onBulkImport={setBulkImportProfile} onToggleStatus={toggleMoneyProfileStatus} onManageAccess={(p) => setShareSheet({ kind: 'profile', target: p })}
          onSyncBalance={syncMoneyProfileBalance} onOpenRecurring={(p) => setRecurringProfileId(p.id)} />,
      )}
      {view === 'budgets' && page(
        <BudgetsView data={data} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onSetMonth={(year, month) => setBudgetMonthForm({ year, month })}
          onCloseMonth={closeBudgetMonth} onReopenMonth={reopenBudgetMonth} onDeleteMonth={deleteBudgetMonth}
          onAddYearly={() => setBudgetForm({ open: true, editing: null })} onEditYearly={(b) => setBudgetForm({ open: true, editing: b })} onDeleteYearly={deleteYearlyBudget} />,
      )}
      {view === 'scholarships' && page(
        <ScholarshipsView data={data} initialSelectedId={initialSelectedId} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onDetailChange={setActiveDetailId} onRefresh={refresh}
          onAdd={() => setScholarshipForm({ open: true, editing: null })} onEdit={(x) => setScholarshipForm({ open: true, editing: x })} onPay={setScholarshipPay}
          onDelete={(x, after) => confirmDelete(`Delete "${x.name}"?`, 'Linked payments will be removed.', async () => { try { await api(`/finance/scholarships/${x.id}`, { method: 'DELETE' }); after?.(); toast.push('Deleted'); await refresh() } catch { toast.push('Delete failed', 'error') } })} />,
      )}
      {view === 'bucket' && page(
        <BucketListView data={data} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onAdd={() => setBucketForm({ open: true, editing: null })} onEdit={(b) => setBucketForm({ open: true, editing: b })}
          onDelete={(b) => confirmDelete(`Remove "${b.title}" from bucket list?`, '', async () => { try { await api(`/finance/bucket_list/${b.id}`, { method: 'DELETE' }); toast.push('Removed'); await refresh() } catch (e) { toast.push(e.message, 'error') } })} />,
      )}
      {view === 'profile' && page(
        <SettingsView data={data} user={user} refresh={refresh} section={settingsSection} onSectionChange={setSettingsSection} onSaveProfile={saveProfile}
          onDeleteAccount={deleteUserAccount} onClearAllData={clearAllData} onSignOut={() => dialog.alert('Sign out?', '', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', onPress: signOut }])}
          onHiddenPinChanged={() => refresh()} onReplayTour={() => setForceTour(1)} pickerRef={settingsPickerRef} renderVault={() => <VaultView data={data} refresh={refresh} />} />,
      )}

      <Pressable onPress={runFabAction} className="absolute right-5 z-30 h-14 w-14 active:scale-95 active:opacity-80" style={{ bottom: 96 + insets.bottom }}>
        <AccentGradient style={{ flex: 1, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 16 }}>
          <Plus size={24} color="#07101c" />
        </AccentGradient>
      </Pressable>

      <View className={tw('absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 light:border-black/10 bg-[#0b0f18]/95 light:bg-white/90 glassy:glass-nav')} style={{ paddingBottom: insets.bottom }}>
        <View className="flex-row">
          {primaryMobileNav.map((n) => {
            const active = navActive === n.key
            return (
              <Pressable key={n.key} ref={(r) => { navRefs.current[n.key] = r }} onPress={() => setView(n.key)} className="flex-1 items-center gap-1 py-3 active:opacity-50">
                <Icon as={n.icon} size={18} className={active ? 'text-accent-300 light:text-accent-700' : 'text-slate-500'} />
                <Text numberOfLines={1} className={tw('px-1 text-[11px]', active ? 'text-accent-300 light:text-accent-700' : 'text-slate-500')}>{n.label}</Text>
              </Pressable>
            )
          })}
          <Pressable ref={(r) => { navRefs.current.more = r }} onPress={() => setMoreOpen(true)} className="flex-1 items-center gap-1 py-3 active:opacity-50">
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
              <Pressable key={n.key} ref={(r) => { navRefs.current[`more:${n.key}`] = r }} onPress={() => { setMoreOpen(false); setView(n.key) }} style={{ width: '31%' }}
                className={tw('items-center gap-2 rounded-xl border p-4 glassy:glass-pill active:opacity-60', active ? 'border-accent-300/30 bg-accent-400/10' : 'border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03]')}>
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
      <CardPayForm open={!!payCard} card={payCard ? data.credit_cards.find((c) => c.id === payCard.id) || payCard : null} accounts={dropdownAccounts} profile={data.profile} onClose={() => setPayCard(null)} onSaved={async () => { setPayCard(null); await refresh() }} />
      <NotificationsSheet open={notifOpen} onClose={() => setNotifOpen(false)} onNavigate={(v) => setView({ credit_cards: 'cards', lend_borrow: 'lend', chit_funds: 'chitfunds', settings: 'profile' }[v] || v)} onUnreadChange={setUnread} />
      <PortfolioForm open={portfolioForm.open} editing={portfolioForm.editing} accounts={dropdownAccounts} onClose={() => setPortfolioForm({ open: false, editing: null })} onSaved={savedThen(() => setPortfolioForm({ open: false, editing: null }))} />
      <HoldingForm open={!!holdingForm} editing={holdingForm?.editing} defaultPortfolioId={holdingForm?.portfolioId} portfolios={data.portfolios} profile={data.profile} onClose={() => setHoldingForm(null)} onSaved={savedThen(() => setHoldingForm(null))} />
      <PortfolioFundsForm open={!!fundsForm} portfolio={fundsForm?.portfolio} mode={fundsForm?.mode} accounts={dropdownAccounts} onClose={() => setFundsForm(null)} onSaved={savedThen(() => setFundsForm(null))} />
      <SipForm open={sipForm.open} editing={sipForm.editing} portfolios={data.portfolios} onClose={() => setSipForm({ open: false, editing: null })} onSaved={savedThen(() => setSipForm({ open: false, editing: null }))} />
      <OtherInvestmentForm open={!!otherInvForm} editing={otherInvForm?.editing} portfolioId={otherInvForm?.portfolioId} onClose={() => setOtherInvForm(null)} onSaved={savedThen(() => setOtherInvForm(null))} />
      <HoldingsBulkImport open={!!holdingsImport} portfolio={holdingsImport} onClose={() => setHoldingsImport(null)} onImported={savedThen(() => setHoldingsImport(null))} />
      <MoneyProfileForm open={profileForm.open} editing={profileForm.editing} accounts={data.accounts} onClose={() => setProfileForm({ open: false, editing: null })} onSaved={async () => { setProfileForm({ open: false, editing: null }); await refresh() }} />
      <MoneyProfileEntryForm open={!!entryForm} editing={entryForm?.editing} profile={entryProfile} accounts={dropdownAccounts} creditCards={data.credit_cards} categories={entryProfile ? categoriesFor(entryProfile, data.categories) : data.categories} onClose={() => setEntryForm(null)} onSaved={async () => { setEntryForm(null); await refresh() }} />
      <MoneyProfileBulkImport open={!!bulkImportProfile} profile={bulkImportProfile} categories={bulkImportProfile ? categoriesFor(bulkImportProfile, data.categories) : []} onClose={() => setBulkImportProfile(null)} onImported={async () => { setBulkImportProfile(null); await refresh() }} />
      <RecurringEntryManager open={!!recurringProfile} profile={recurringProfile} rules={(data.recurring_money_profile_entries || []).filter((r) => r.profile_id === recurringProfileId)} accounts={dropdownAccounts} creditCards={data.credit_cards} categories={recurringProfile ? categoriesFor(recurringProfile, data.categories) : []}
        onClose={() => setRecurringProfileId(null)} onToggle={toggleRecurringEntry} onDelete={deleteRecurringEntry} onSaved={refresh} showMoney={showMoney} />
      <BudgetMonthForm open={!!budgetMonthForm} initialYear={budgetMonthForm?.year ?? new Date().getFullYear()} initialMonth={budgetMonthForm?.month ?? new Date().getMonth()} budgetMonths={data.budget_months} budgetMonthCategories={data.budget_month_categories} categories={data.categories} onClose={() => setBudgetMonthForm(null)} onSaved={async () => { setBudgetMonthForm(null); await refresh() }} />
      <BudgetForm open={budgetForm.open} editing={budgetForm.editing} categories={data.categories} onClose={() => setBudgetForm({ open: false, editing: null })} onSaved={async () => { setBudgetForm({ open: false, editing: null }); await refresh() }} />
      <ScholarshipForm open={scholarshipForm.open} editing={scholarshipForm.editing} accounts={dropdownAccounts} onClose={() => setScholarshipForm({ open: false, editing: null })} onSaved={async () => { setScholarshipForm({ open: false, editing: null }); await refresh() }} />
      <ScholarshipPayForm open={!!scholarshipPay} scholarship={scholarshipPay} accounts={dropdownAccounts} onClose={() => setScholarshipPay(null)} onSaved={async () => { setScholarshipPay(null); await refresh() }} />
      <BucketForm open={bucketForm.open} editing={bucketForm.editing} onClose={() => setBucketForm({ open: false, editing: null })} onSaved={async () => { setBucketForm({ open: false, editing: null }); await refresh() }} />
      <ChitFundForm open={chitForm.open} editing={chitForm.editing} accounts={dropdownAccounts} onClose={() => setChitForm({ open: false, editing: null })} onSaved={async () => { setChitForm({ open: false, editing: null }); await refresh() }} />
      <ChitFundPaymentForm open={!!chitPayment} fund={chitPayment?.fund} editing={chitPayment?.editing} accounts={dropdownAccounts} onClose={() => setChitPayment(null)} onSaved={async () => { setChitPayment(null); await refresh() }} />
      <ChitFundPayoutForm open={!!chitPayout} fund={chitPayout} accounts={dropdownAccounts} onClose={() => setChitPayout(null)} onSaved={async () => { setChitPayout(null); await refresh() }} />
      <ScheduledDuePrompt open={duePromptOpen && dueScheduled.length > 0} onClose={() => setDuePromptOpen(false)} items={dueScheduled} accounts={data.accounts} creditCards={data.credit_cards} onChanged={refresh} />
      {unlocked && onboardSteps?.length > 0 && <PermissionsOnboarding steps={onboardSteps} onDone={() => setOnboardSteps([])} />}
      <SpotlightTour steps={TOUR_STEPS} open={tourOpen} startIndex={typeof forceTour === 'number' ? forceTour - 1 : 0} context={tourContext} getTarget={tourTarget} onSkip={closeTour} onFinish={closeTour} />
      <TypeToConfirm state={typeConfirm} onClose={async (ok) => { const s = typeConfirm; setTypeConfirm(null); if (ok) await s.run() }} />
    </View>
  )
}
