'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { createClient } from '@/lib/supabase/browser'
import { removeAttachment, uploadAttachment } from '@/lib/attachments'
import { calcEmi, daysBetween, projectSchedule, totalInterest } from '@/lib/amortization'
import {
  MONTH_NAMES, addMonthsToDate, capitalizeFirst, formatDate, formatDateTime, liveOutstanding, maskedMoney, money, money2,
  monthAbbr, monthName, ordinal, paymentTypeLabel, todayISO,
} from '@/lib/format'
import { PALETTE } from '@/lib/palette'
import { applyAccentColor } from '@/lib/color'
import { useTheme } from 'next-themes'
import { clearSnapshot, loadSnapshot, saveSnapshot } from '@/lib/offline/db'
import { createMutate, flushOutbox, getPendingCount, registerAutoFlush } from '@/lib/offline/mutate'
import { useToast } from '@/components/shared/Toast'
import { useConfirm } from '@/components/shared/ConfirmDialog'
import { usePrompt } from '@/components/shared/PromptDialog'
import { Select } from '@/components/shared/Select'
import { CsvBulkImport } from '@/components/shared/CsvBulkImport'
import { CategorySelect } from '@/components/shared/CategorySelect'
import { DateInput } from '@/components/shared/DateInput'
import { StatCard } from '@/components/shared/StatCard'
import { StatDrilldown } from '@/components/shared/StatDrilldown'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/shared/Skeleton'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { Avatar } from '@/components/shared/Avatar'
import { CreditCardBillAlert } from '@/components/shared/CreditCardBillAlert'
import { InstallPrompt } from '@/components/shared/InstallPrompt'
import { SpotlightTour } from '@/components/shared/SpotlightTour'
import { TOUR_STEPS } from '@/features/onboarding/tourSteps'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { ToggleSwitch } from '@/components/shared/ToggleSwitch'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { CategoryForm } from '@/features/categories/CategoryForm'
import { MoneyRulesWidget } from '@/features/money-rules/MoneyRulesWidget'
import { SettingsShell } from '@/features/settings/SettingsShell'
import { resolveModuleSettings, resolveDashboardWidgets, orderedEnabledKeys, resolveMobileNavSlots, resolveQuickActionSlots } from '@/lib/moduleSettings'
import { NAV_META, VIEW_TO_MODULE, MOBILE_MANDATORY_META, ADD_ACTION_META } from '@/lib/navMeta'
import { AccountForm } from '@/features/accounts/AccountForm'
import { AccountsView } from '@/features/accounts/AccountsView'
import { BudgetForm } from '@/features/budgets/BudgetForm'
import { BudgetMonthForm } from '@/features/budgets/BudgetMonthForm'
import { BudgetsView } from '@/features/budgets/BudgetsView'
import { RecurringForm } from '@/features/recurring/RecurringForm'
import { RecurringManager } from '@/features/recurring/RecurringManager'
import { PortfolioForm } from '@/features/investments/PortfolioForm'
import { HoldingForm } from '@/features/investments/HoldingForm'
import { OtherInvestmentForm } from '@/features/investments/OtherInvestmentForm'
import { PortfolioFundsForm } from '@/features/investments/PortfolioFundsForm'
import { WithdrawFundsForm } from '@/features/investments/WithdrawFundsForm'
import { HoldingsBulkImport } from '@/features/investments/HoldingsBulkImport'
import { SipForm } from '@/features/investments/SipForm'
import { InvestmentsView } from '@/features/investments/InvestmentsView'
import { LoanForm } from '@/features/loans/LoanForm'
import { LoanPaymentForm } from '@/features/loans/LoanPaymentForm'
import { LoansView } from '@/features/loans/LoansView'
import { BucketForm } from '@/features/buckets/BucketForm'
import { BucketListView } from '@/features/buckets/BucketListView'
import { LendForm } from '@/features/lend-borrow/LendForm'
import { LendBorrowView } from '@/features/lend-borrow/LendBorrowView'
import { ManageLendAccessSheet } from '@/features/lend-borrow/ManageLendAccessSheet'
import { CreditCardForm } from '@/features/credit-cards/CreditCardForm'
import { CardSpendForm } from '@/features/credit-cards/CardSpendForm'
import { CardPayForm } from '@/features/credit-cards/CardPayForm'
import { CreditCardsView } from '@/features/credit-cards/CreditCardsView'
import { ScholarshipForm } from '@/features/scholarships/ScholarshipForm'
import { ScholarshipPayForm } from '@/features/scholarships/ScholarshipPayForm'
import { ScholarshipsView } from '@/features/scholarships/ScholarshipsView'
import { MoneyProfileForm } from '@/features/familyCompany/MoneyProfileForm'
import { MoneyProfileEntryForm } from '@/features/familyCompany/MoneyProfileEntryForm'
import { MoneyProfileBulkImport } from '@/features/familyCompany/MoneyProfileBulkImport'
import { FamilyCompanyView } from '@/features/familyCompany/FamilyCompanyView'
import { ManageAccessSheet } from '@/features/familyCompany/ManageAccessSheet'
import { categoriesFor } from '@/lib/moneyProfiles'
import { VaultItemForm } from '@/features/vault/VaultItemForm'
import { InsightsView } from '@/features/insights/InsightsView'
import { NetWorthDetailView } from '@/features/dashboard/NetWorthDetailView'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts'
import {
  ArrowDownRight, ArrowLeftRight, ArrowUpDown, ArrowUpRight, BarChart3, Briefcase, Calculator, Calendar, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, CreditCard,
  Download, Eye, EyeOff, FileText, Heart, History, Info, Landmark, LayoutDashboard, LineChart, ListChecks, LogOut, Menu, MoreHorizontal, MoreVertical, Mountain, Paperclip, PieChart as PieChartIcon, Plus,
  RefreshCw, Repeat, Search, Settings, ShieldCheck, Star, Tag, Target, TrendingDown, TrendingUp, Trash2, Pencil, Users,
  Wallet, X, Zap,
} from 'lucide-react'

/* ---------------- Transaction Form ---------------- */
function TransactionForm({ open, onClose, onSaved, editing, accounts, categories, creditCards = [], lendBorrow = [], loans = [], transactions = [], onAddAccount, onAddCategory, toast, profile, defaultAccountId = '', defaultRepayment = null, mutate }) {
  const now = todayISO()
  const nowTime = new Date().toTimeString().slice(0, 5)
  const initial = useMemo(() => {
    if (editing) return { ...editing, amount: String(editing.amount), time: editing.time?.slice(0, 5) || nowTime, to_account_id: '', account_id: editing.linked_module === 'credit_card' ? `cc:${editing.linked_module_id}` : (editing.account_id || ''), repay_value: editing.linked_module === 'lend' ? `lend:${editing.linked_module_id}` : '' }
    // No blind pre-filled default here on purpose — silently defaulting to whichever account
    // happens to be first let transactions land on the wrong account without anyone noticing
    // (e.g. an income entry meant for a cash account quietly going to a bank account instead).
    // defaultAccountId is the one exception: it's only ever set when this form was opened FROM
    // that specific account's own page (see AccountDetailView's "+ Add transaction"), so the
    // default is a conscious, contextual one rather than an arbitrary "first in list" guess —
    // and it's still just a starting value, freely changeable before submitting. defaultRepayment
    // is the same idea for Lend/Borrow's own "+ Log repayment" button — pre-selects that exact
    // person in Repayment mode instead of leaving the user to find them in a dropdown themselves.
    return { type: defaultRepayment?.type || 'expense', amount: '', description: '', date: now, time: nowTime, account_id: defaultAccountId || '', to_account_id: '', category_id: '', notes: '', linked_module: '', linked_module_id: '', repay_value: defaultRepayment?.value || '' }
  }, [editing, open, defaultAccountId, defaultRepayment])
  const [form, setForm] = useState(initial)
  // 'category' = normal spending/income category selected; 'repayment' = this transaction is
  // settling a loan or a lend/borrow debt instead, and picks a target from that list.
  const [purposeMode, setPurposeMode] = useState(initial.repay_value ? 'repayment' : 'category')
  const [busy, setBusy] = useState(false)
  const [attachmentFile, setAttachmentFile] = useState(null)
  const [attachmentRemoved, setAttachmentRemoved] = useState(false)
  const [viewingAttachment, setViewingAttachment] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState(null)
  const [descOpen, setDescOpen] = useState(false)
  const descRef = useRef(null)
  const confirm = useConfirm()
  useEffect(() => { setForm(initial); setPurposeMode(initial.repay_value ? 'repayment' : 'category'); setAttachmentFile(null); setAttachmentRemoved(false); setHistoryOpen(false); setHistory(null); setDescOpen(false) }, [initial])
  useEffect(() => {
    const onDocClick = (e) => { if (descRef.current && !descRef.current.contains(e.target)) setDescOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])
  // Recurring descriptions ("Groceries at BigBazaar", "Salary") repeat often enough that
  // resurfacing them beats retyping — scoped to the current type so an expense doesn't
  // surface old income descriptions like "Salary".
  const descriptionSuggestions = useMemo(() => {
    const byKey = new Map()
    for (const t of transactions) {
      if (t.type !== form.type) continue
      const raw = (t.description || '').trim()
      if (!raw) continue
      const key = raw.toLowerCase()
      const entry = byKey.get(key)
      if (entry) { entry.count += 1; if ((t.date || '') > entry.lastDate) { entry.lastDate = t.date || ''; entry.original = raw } }
      else byKey.set(key, { original: raw, count: 1, lastDate: t.date || '' })
    }
    return [...byKey.values()].sort((a, b) => b.count - a.count || (a.lastDate < b.lastDate ? 1 : -1))
  }, [transactions, form.type])

  if (!open) return null

  const descQuery = form.description.trim().toLowerCase()
  const filteredDescriptionSuggestions = descQuery
    ? descriptionSuggestions.filter((s) => s.original.toLowerCase().includes(descQuery) && s.original.toLowerCase() !== descQuery).slice(0, 6)
    : []

  const toggleHistory = async () => {
    if (historyOpen) { setHistoryOpen(false); return }
    setHistoryOpen(true)
    if (!history) {
      const response = await fetch(`/api/finance/transactions/${editing.id}/history`)
      setHistory(response.ok ? await response.json() : [])
    }
  }
  const catsForType = categories.filter((c) => c.type === (form.type === 'income' ? 'income' : 'expense') && !(c.hidden_in_modules || []).includes('transactions'))
  const openLends = lendBorrow.filter((l) => l.type === 'lent' && l.status !== 'returned')
  const openBorrows = lendBorrow.filter((l) => l.type === 'borrowed' && l.status !== 'returned')
  // Loan prepayments route through the dedicated /loan_payments endpoint, which has no matching
  // edit path — only offer it here for brand-new transactions. The full Reduce Tenure/Reduce EMI
  // choice lives in the Loan module's own Log Payment form; this quick picker always uses Reduce
  // Tenure (the better default per the amortization math) so it can stay a one-tap shortcut.
  const openLoans = !editing ? loans.filter((l) => l.status !== 'closed') : []
  const realAccounts = accounts.filter((a) => a.type !== 'debit_card')
  const debitCards = accounts.filter((a) => a.type === 'debit_card')
  // Debit cards draw from the same balance as their linked bank account, so they're only
  // meaningful as a spending source — a debit card can't "receive" income.
  const sourceOptions = [
    ...realAccounts.map((a) => ({ value: a.id, label: a.name })),
    ...(form.type !== 'transfer' && form.type !== 'income' ? debitCards.map((c) => ({ value: c.id, label: c.name })) : []),
    // A repayment settles a loan or a lend/borrow debt, tracked at the bank/cash level — credit
    // cards aren't a supported funding source for that here, so leave them out while in this mode.
    ...(form.type !== 'transfer' && purposeMode !== 'repayment' ? creditCards.map((c) => ({ value: `cc:${c.id}`, label: c.name })) : []),
  ]
  const hasAnySource = realAccounts.length > 0 || creditCards.length > 0
  const repayOptions = form.type === 'income'
    ? openLends.map((l) => ({ kind: 'lend', id: l.id, label: `${l.person_name} · pending ${money(Number(l.amount) - Number(l.amount_repaid))}` }))
    : form.type === 'expense'
      ? [
          ...openLoans.map((l) => ({ kind: 'loan', id: l.id, label: `Loan · ${l.name} · outstanding ${money(Number(l.outstanding))}` })),
          ...openBorrows.map((l) => ({ kind: 'lend', id: l.id, label: `${l.person_name} · pending ${money(Number(l.amount) - Number(l.amount_repaid))}` })),
        ]
      : []
  const canRepay = (form.type === 'income' || form.type === 'expense') && repayOptions.length > 0

  const resetPurpose = (mode) => {
    setPurposeMode(mode)
    setForm({ ...form, repay_value: '', linked_module: '', linked_module_id: '', category_id: mode === 'category' ? (categories.find((c) => c.type === (form.type === 'income' ? 'income' : 'expense'))?.id || '') : '' })
  }

  // `form.account_id` is always the money-leaving side regardless of which branch below actually
  // ends up saving it (plain expense, transfer, loan/lend repayment, or a credit-card bill
  // payment). Credit cards can never go past their own limit — that's a hard stop, no override.
  // Between 30% and the limit it's a "Confirm" prompt, same shape as the bank one below. Banks/
  // cash/debit default to a hard stop too, but that default lives in Profile settings — turning
  // it off there swaps the block for the same "confirm anyway" prompt.
  const warnIfRisky = async () => {
    if (form.type === 'income') return true
    const amount = Number(form.amount)
    if (!(amount > 0)) return true
    const sourceId = form.account_id
    if (typeof sourceId === 'string' && sourceId.startsWith('cc:')) {
      const card = creditCards.find((c) => c.id === sourceId.slice(3))
      if (card) {
        const limit = Number(card.credit_limit || 0)
        if (limit > 0) {
          const pct = ((Number(card.current_outstanding || 0) + amount) / limit) * 100
          if (pct >= 100) {
            await confirm.ask(`"${card.name}" only has ${money(Math.max(0, limit - Number(card.current_outstanding || 0)))} of headroom left — this would go over its credit limit.`, { okOnly: true })
            return false
          }
          if (pct > 30) {
            return confirm.ask(`This puts "${card.name}" at ${Math.round(pct)}% of its limit — best practice is staying under 30–40%. Do you want to confirm this payment anyway?`, { confirmLabel: 'Confirm' })
          }
        }
      }
      return true
    }
    const debitCard = debitCards.find((c) => c.id === sourceId)
    const account = accounts.find((a) => a.id === (debitCard ? debitCard.linked_account_id : sourceId))
    if (account && amount > Number(account.current_balance || 0)) {
      if (profile?.block_insufficient_funds === false) {
        return confirm.ask(`You don't have that much money in "${account.name}" — do you want to confirm this payment anyway?`, { confirmLabel: 'Confirm' })
      }
      await confirm.ask(`"${account.name}" doesn't have that much balance, so this is blocked. You may have missed logging some income — add it first to keep your accounting accurate, or turn this block off in your Profile settings.`, { okOnly: true })
      return false
    }
    return true
  }

  const save = async (event) => {
    event.preventDefault()
    if (!(await warnIfRisky())) return
    setBusy(true)
    try {
      const [repayKind, repayId] = purposeMode === 'repayment' ? (form.repay_value || '').split(':') : []
      const isCreditCardFunded = typeof form.account_id === 'string' && form.account_id.startsWith('cc:')
      const isCreditCardPayoff = form.type === 'transfer' && typeof form.to_account_id === 'string' && form.to_account_id.startsWith('cc:')
      // These all route through endpoints with their own extra side effects (loan outstanding,
      // credit card outstanding, lend/borrow repayment tracking) on top of the plain account-
      // balance trigger — safe to replay from an offline queue once reconnected, but not safe to
      // optimistic-apply locally the way the plain expense/income/transfer path below can.
      if (!navigator.onLine && (purposeMode === 'repayment' || isCreditCardFunded || isCreditCardPayoff)) {
        throw new Error('This kind of transaction needs a connection — try again once you’re back online.')
      }

      if (purposeMode === 'repayment' && typeof form.account_id === 'string' && form.account_id.startsWith('cc:')) {
        throw new Error('Choose a bank, cash, or debit account to pay a repayment from — credit cards aren’t supported for this yet.')
      }

      if (isCreditCardPayoff) {
        // Paying a credit card bill is really a transfer into debt payoff — route through the
        // Credit Cards module's own endpoint so the outstanding balance updates correctly.
        const cardId = form.to_account_id.slice(3)
        const debitCard = debitCards.find((c) => c.id === form.account_id)
        const payingAccountId = debitCard ? debitCard.linked_account_id : form.account_id
        const response = await fetch(`/api/finance/credit_cards/${cardId}/pay_bill`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ account_id: payingAccountId, amount: Number(form.amount), date: form.date, notes: form.notes || form.description || null }) })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
        toast.push('Credit card bill paid')
        onSaved()
        return
      }

      if (repayKind === 'loan' && repayId) {
        // A debit card has no balance of its own — resolve it to the real bank account first.
        const debitCard = debitCards.find((c) => c.id === form.account_id)
        const payingAccountId = debitCard ? debitCard.linked_account_id : form.account_id
        // A payment logged from here is a regular EMI, not a prepayment — "Prepayment" is
        // reserved for the Loan module's own Log Payment form, where the reduce-tenure/reduce-EMI
        // choice and interest-saved tracking actually apply. This still reuses the same
        // /loan_payments endpoint so outstanding updates exactly as it would from there.
        const response = await fetch('/api/finance/loan_payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loan_id: repayId, amount: Number(form.amount), type: 'emi', payment_date: form.date, account_id: payingAccountId, notes: form.notes || form.description || null }) })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
        toast.push('Payment logged')
        onSaved()
        return
      }

      const endpoint = editing ? `/api/finance/transactions/${editing.id}` : '/api/finance/transactions'
      const payload = { ...form, amount: Number(form.amount) }
      delete payload.repay_value
      // category_id is a nullable UUID column — an empty string (not NULL) makes Postgres reject it.
      payload.category_id = payload.category_id || null
      if (payload.type !== 'transfer') delete payload.to_account_id
      if (repayKind === 'lend' && repayId) {
        payload.linked_module = 'lend'
        payload.linked_module_id = repayId
      } else {
        payload.linked_module = ''
        payload.linked_module_id = ''
      }
      if (!payload.linked_module_id) { delete payload.linked_module; delete payload.linked_module_id }
      if (typeof payload.account_id === 'string' && payload.account_id.startsWith('cc:')) {
        payload.credit_card_id = payload.account_id.slice(3)
        delete payload.account_id
      } else {
        // A debit card is just an alias for its linked bank account — resolve
        // it here so the saved transaction (and balance) point at the real account.
        const debitCard = debitCards.find((c) => c.id === payload.account_id)
        if (debitCard) payload.account_id = debitCard.linked_account_id
      }
      const { record: data, queued } = await mutate({ table: 'transactions', method: editing ? 'PATCH' : 'POST', id: editing?.id, body: payload })

      // A queued (offline) write only has a temp id — Storage upload / attachment PATCH both
      // need a real, already-persisted row, so they're deferred rather than attempted against
      // an id the server doesn't know about yet.
      if (!queued) {
        if (attachmentRemoved && editing?.attachment_path) {
          await removeAttachment(`/api/finance/transactions/${data.id}/attachment`)
        }
        if (attachmentFile) {
          const { error: uploadError } = await uploadAttachment(`/api/finance/transactions/${data.id}`, data.id, attachmentFile)
          if (uploadError) toast.push('Transaction saved, but the attachment failed to upload', 'error')
        }
      } else if (attachmentFile || attachmentRemoved) {
        toast.push('Saved — the attachment change will need to be redone once you’re back online', 'warning')
      }

      toast.push(queued ? `Transaction ${editing ? 'updated' : 'added'} — will sync when back online` : `Transaction ${editing ? 'updated' : 'added'}`)
      onSaved()
    } catch (e) { toast.push(e.message, 'error') } finally { setBusy(false) }
  }

  return (
    <>
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border-t border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6 shadow-2xl sm:max-w-xl sm:rounded-3xl sm:border" style={{ paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 1.5rem))' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white light:text-slate-900">{editing ? 'Edit transaction' : 'Add transaction'}</h2>
            <p className="mt-1 text-xs text-slate-500">Keep the context, not just the number</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 light:text-slate-500 hover:bg-white/5"><X size={18} /></button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {[{ v: 'expense', l: 'Expense', c: 'bg-rose-400/15 text-rose-200 light:text-rose-700 border-rose-400/30' }, { v: 'income', l: 'Income', c: 'bg-emerald-400/15 text-emerald-200 light:text-emerald-700 border-emerald-400/30' }, { v: 'transfer', l: 'Transfer', c: 'bg-accent-400/15 text-accent-200 light:text-accent-700 border-accent-400/30' }].map((t) => (
            <button key={t.v} type="button" onClick={() => { setPurposeMode('category'); setForm({ ...form, type: t.v, category_id: t.v === 'transfer' ? '' : (categories.find((c) => c.type === (t.v === 'income' ? 'income' : 'expense'))?.id || ''), linked_module: '', linked_module_id: '', repay_value: '' }) }} className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${form.type === t.v ? t.c : 'border-white/10 light:border-black/10 text-slate-400 light:text-slate-500 hover:bg-white/5'}`}>{t.l}</button>
          ))}
        </div>

        {!hasAnySource && (
          <div className="mt-5 rounded-xl border border-amber-300/25 bg-amber-300/5 px-4 py-3 text-sm text-amber-200 light:text-amber-700">
            <div className="flex items-center gap-2"><Landmark size={14} /> You don&apos;t have any accounts yet.</div>
            <button type="button" onClick={onAddAccount} className="mt-2 rounded-lg bg-amber-300/20 px-3 py-1.5 text-xs font-semibold text-amber-100 light:text-amber-800 hover:bg-amber-300/30">+ Add your first account</button>
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-300 light:text-slate-700">Amount
            <input required min="0.01" step="0.01" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="0.00" />
          </label>
          <label className="text-sm text-slate-300 light:text-slate-700">Date
            <DateInput value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value, time: new Date().toTimeString().slice(0, 5) })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
          </label>

          <label className="text-sm text-slate-300 light:text-slate-700">{form.type === 'transfer' ? 'From account' : 'Account'}
            <Select required={hasAnySource} value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50">
              <option value="">Choose account…</option>
              {sourceOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </label>

          {form.type === 'transfer' ? (
            <label className="text-sm text-slate-300 light:text-slate-700">To account
              <Select required value={form.to_account_id} onChange={(e) => setForm({ ...form, to_account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50">
                <option value="">Choose destination…</option>
                {realAccounts.filter((a) => a.id !== form.account_id).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                {creditCards.filter((c) => Number(c.current_outstanding) > 0).map((c) => <option key={c.id} value={`cc:${c.id}`}>{c.name} · pay bill</option>)}
              </Select>
            </label>
          ) : (
            <div className="text-sm text-slate-300 light:text-slate-700 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span>{purposeMode === 'repayment' ? (form.type === 'income' ? 'Repayment from' : 'Repaying') : 'Category'}</span>
                {canRepay && (
                  <div className="flex gap-1">
                    <button type="button" onClick={() => resetPurpose('category')} className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${purposeMode === 'category' ? 'bg-accent-400/15 text-accent-200 light:text-accent-700' : 'text-slate-500 hover:bg-white/5'}`}>Category</button>
                    <button type="button" onClick={() => resetPurpose('repayment')} className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${purposeMode === 'repayment' ? 'bg-accent-400/15 text-accent-200 light:text-accent-700' : 'text-slate-500 hover:bg-white/5'}`}>{form.type === 'income' ? 'Repayment' : 'Prepayment'}</button>
                  </div>
                )}
              </div>
              {purposeMode === 'repayment' && canRepay ? (
                <>
                  <Select required value={form.repay_value || ''} onChange={(e) => setForm({ ...form, repay_value: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50">
                    <option value="">Choose…</option>
                    {repayOptions.map((o) => <option key={`${o.kind}:${o.id}`} value={`${o.kind}:${o.id}`}>{o.label}</option>)}
                  </Select>
                  <div className="mt-1 text-[11px] text-slate-500">Auto-marks the debt as partially/fully repaid.</div>
                </>
              ) : (
                <CategorySelect value={form.category_id || ''} onChange={(e) => setForm({ ...form, category_id: e.target.value })} categories={catsForType} onAddCategory={onAddCategory} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
              )}
            </div>
          )}

          <label ref={descRef} className="relative text-sm text-slate-300 light:text-slate-700 sm:col-span-2">Description
            <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} onFocus={() => setDescOpen(true)} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder={form.type === 'income' ? 'e.g. Salary, stipend, refund' : form.type === 'transfer' ? 'e.g. Moved to savings' : 'e.g. Groceries at BigBazaar'} />
            {descOpen && filteredDescriptionSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-1.5 shadow-2xl">
                {filteredDescriptionSuggestions.map((s) => (
                  <button key={s.original} type="button" onClick={() => { setForm({ ...form, description: s.original }); setDescOpen(false) }} className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5">
                    <span className="truncate">{s.original}</span>
                    {s.count > 1 && <span className="shrink-0 text-[11px] text-slate-500">×{s.count}</span>}
                  </button>
                ))}
              </div>
            )}
          </label>
          <label className="text-sm text-slate-300 light:text-slate-700 sm:col-span-2">Notes
            <input value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="Optional context" />
          </label>

          <div className="text-sm text-slate-300 light:text-slate-700 sm:col-span-2">
            Receipt / attachment
            {editing?.attachment_path && !attachmentRemoved ? (
              <div className="mt-2 flex items-center justify-between rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3">
                <button type="button" onClick={() => setViewingAttachment(editing)} className="flex min-w-0 items-center gap-2 truncate text-sm text-accent-200 light:text-accent-700 hover:underline"><Paperclip size={14} className="shrink-0 text-slate-500" />{editing.attachment_name || 'Attachment'}</button>
                <button type="button" onClick={() => setAttachmentRemoved(true)} className="shrink-0 rounded-lg p-1.5 text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={14} /></button>
              </div>
            ) : (
              <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/15 light:border-black/10 bg-white/[.02] light:bg-black/[.02] px-3 py-3 text-sm text-slate-400 light:text-slate-500 hover:bg-white/[.04] hover:light:bg-black/[.03]">
                <Paperclip size={14} />
                {attachmentFile ? attachmentFile.name : 'Attach a photo of the receipt (optional)'}
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} />
              </label>
            )}
          </div>

          {editing && (
            <div className="sm:col-span-2">
              <button type="button" onClick={toggleHistory} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 hover:light:text-slate-700"><History size={13} />{historyOpen ? 'Hide edit history' : 'View edit history'}</button>
              {historyOpen && (
                <div className="mt-2 space-y-1.5 rounded-xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02] p-3">
                  {history === null ? (
                    <div className="text-xs text-slate-500">Loading…</div>
                  ) : history.length === 0 ? (
                    <div className="text-xs text-slate-500">No edits recorded yet.</div>
                  ) : history.map((h) => (
                    <div key={h.id} className="text-xs text-slate-400 light:text-slate-500">
                      <span className="text-slate-500">{formatDateTime(h.changed_at?.slice(0, 10), h.changed_at?.slice(11, 16))}</span>{' — '}
                      {Object.entries(h.previous_values).map(([field, prev]) => `${field} was "${prev}"`).join(', ')}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button disabled={busy || !hasAnySource} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">
          {busy ? 'Saving…' : editing ? 'Update transaction' : 'Save transaction'} <ChevronRight size={16} />
        </button>
      </form>
      {confirm.view}
    </div>
    <AttachmentViewer open={!!viewingAttachment} onClose={() => setViewingAttachment(null)} transaction={viewingAttachment} />
    </>
  )
}

/* ---------------- CSV Import ---------------- */
const TX_IMPORT_FIELDS = [
  { key: 'date', label: 'Date', required: true },
  { key: 'description', label: 'Description', required: true, detect: (l) => l.includes('desc') || l === 'narration' || l === 'particulars' },
  { key: 'amount', label: 'Amount', required: true, detect: (l) => l === 'amount' || l.includes('amount') || l === 'value' },
  { key: 'type', label: 'Type', required: false, detect: (l) => l === 'type' || l === 'kind' },
  { key: 'category', label: 'Category', required: false, detect: (l) => l.includes('categ') },
  { key: 'notes', label: 'Notes', required: false, detect: (l) => l.includes('note') },
]

function CsvImport({ open, onClose, onImported, accounts, categories, transactions = [], toast }) {
  const [defaultAccount, setDefaultAccount] = useState(accounts[0]?.id || '')
  useEffect(() => { if (open) setDefaultAccount(accounts[0]?.id || '') }, [open, accounts])

  // Pure per-row parse — used both to build the preview (so what you see is exactly what gets
  // imported) and to actually import, instead of two versions of the same logic drifting apart.
  const parseRow = (r, mapping) => {
    const rawAmount = String(r[mapping.amount] || '').replace(/[,₹\s]/g, '')
    const amount = Number(rawAmount)
    const valid = !!amount && !isNaN(amount)
    const rawType = (mapping.type ? String(r[mapping.type] || '').toLowerCase() : '')
    let finalType = 'expense'
    if (rawType.includes('income') || rawType.includes('credit') || rawType === 'cr') finalType = 'income'
    else if (rawType.includes('expense') || rawType.includes('debit') || rawType === 'dr') finalType = 'expense'
    else if (rawAmount.startsWith('-')) finalType = 'expense'
    const catName = mapping.category ? String(r[mapping.category] || '').trim().toLowerCase() : ''
    const cat = catName ? categories.find((c) => c.name.toLowerCase() === catName && c.type === finalType) : null
    let dateVal = r[mapping.date] || todayISO()
    const m = String(dateVal).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
    if (m) { const y = m[3].length === 2 ? `20${m[3]}` : m[3]; dateVal = `${y}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}` }
    const description = String(r[mapping.description] || 'Import').slice(0, 200)
    return {
      valid, type: finalType, amount: Math.abs(amount), description, date: dateVal,
      account_id: defaultAccount, category_id: cat?.id || null, notes: mapping.notes ? String(r[mapping.notes] || '') : null,
      categoryLabel: cat?.name || (catName ? `"${catName}" (no match)` : '—'),
    }
  }

  // A likely duplicate: an existing transaction with the same date, same amount, and the same
  // description already sitting in the account it'd be imported into — catches "ran the import
  // twice" and "overlapping date range in two exports" without needing exact-ID matching.
  const isDuplicate = (parsed) => transactions.some((t) =>
    t.date === parsed.date && Number(t.amount) === parsed.amount &&
    String(t.description || '').trim().toLowerCase() === parsed.description.trim().toLowerCase() &&
    t.account_id === parsed.account_id)

  return (
    <CsvBulkImport
      open={open}
      onClose={onClose}
      onImported={onImported}
      toast={toast}
      title="Import from CSV or Excel"
      subtitle="Map your columns, review exactly what gets created, then import"
      itemLabel="transaction"
      uploadHint="Bank statement, spreadsheet export — we'll auto-detect columns"
      fields={TX_IMPORT_FIELDS}
      parseRow={parseRow}
      isDuplicate={isDuplicate}
      invalidLabel="unreadable amount, will be skipped"
      readyToImport={!!defaultAccount}
      notReadyMessage="Choose a default account"
      extraFields={
        <label className="text-sm text-slate-300 light:text-slate-700 sm:col-span-2">Default account
          <Select value={defaultAccount} onChange={(e) => setDefaultAccount(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-2.5 text-white light:text-slate-900 outline-none">
            {accounts.filter((a) => a.type !== 'debit_card').map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </label>
      }
      renderTableHead={() => (
        <>
          <th className="px-3 py-2 text-left">Date</th>
          <th className="px-3 py-2 text-left">Description</th>
          <th className="px-3 py-2 text-left">Type</th>
          <th className="px-3 py-2 text-left">Category</th>
          <th className="px-3 py-2 text-right">Amount</th>
        </>
      )}
      renderTableRow={(p) => (
        <>
          <td className="px-3 py-2 text-slate-400 light:text-slate-500">{p.valid ? formatDate(p.date) : '—'}</td>
          <td className="px-3 py-2 text-slate-300 light:text-slate-700">
            {p.description}
            {p.duplicate && <span className="ml-2 rounded-full bg-amber-300/15 px-1.5 py-0.5 text-[10px] text-amber-200 light:text-amber-700">possible duplicate</span>}
            {!p.valid && <span className="ml-2 rounded-full bg-rose-300/15 px-1.5 py-0.5 text-[10px] text-rose-200 light:text-rose-700">unreadable amount</span>}
          </td>
          <td className="px-3 py-2 capitalize text-slate-400 light:text-slate-500">{p.type}</td>
          <td className="px-3 py-2 text-slate-400 light:text-slate-500">{p.categoryLabel}</td>
          <td className="px-3 py-2 text-right text-slate-300 light:text-slate-700">{p.valid ? money(p.amount) : '—'}</td>
        </>
      )}
      onImportRow={async (p) => {
        const { valid, duplicate, categoryLabel, ...payload } = p
        const res = await fetch('/api/finance/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        return res.ok
      }}
    />
  )
}


function TransactionRow({ t, categories, accounts, creditCards = [], showMoney }) {
  const cat = categories.find((c) => c.id === t.category_id)
  const acc = accounts.find((a) => a.id === t.account_id) || (t.linked_module === 'credit_card' ? creditCards.find((c) => c.id === t.linked_module_id) : null)
  const sign = t.type === 'income' || (t.type === 'transfer' && t.transfer_direction === 'in') ? '+' : '-'
  const color = t.type === 'income' || (t.type === 'transfer' && t.transfer_direction === 'in') ? 'text-emerald-300 light:text-emerald-700' : t.type === 'transfer' ? 'text-accent-300 light:text-accent-700' : 'text-rose-300 light:text-rose-700'
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 light:border-black/5 px-3.5 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[.05] light:bg-black/[.035]" style={{ color: cat?.color || '#94a3b8' }}>
          {t.type === 'transfer' ? <ArrowLeftRight size={14} aria-hidden="true" /> : t.type === 'income' ? <ArrowUpRight size={14} aria-hidden="true" /> : <ArrowDownRight size={14} aria-hidden="true" />}
          <span className="sr-only">{t.type === 'transfer' ? 'Transfer' : t.type === 'income' ? 'Income' : 'Expense'}</span>
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-white light:text-slate-900">{capitalizeFirst(t.description)}</div>
          <div className="truncate text-[11px] text-slate-400 light:text-slate-500">{cat?.name || (t.type === 'transfer' ? 'Transfer' : 'Uncategorised')}{acc ? ` · ${acc.name}` : ''} · {formatDateTime(t.date, t.time)}</div>
        </div>
      </div>
      <div className={`shrink-0 text-right text-sm font-semibold ${color}`}>{showMoney ? `${sign}${money(t.amount).replace('-', '')}` : '••••'}</div>
    </div>
  )
}

function TransactionTicker({ items, categories, accounts, creditCards = [], showMoney, maxHeightPx = 352 }) {
  const boxRef = useRef(null)
  const trackRef = useRef(null)
  const [scroll, setScroll] = useState(false)

  useLayoutEffect(() => { setScroll(false) }, [items])
  useLayoutEffect(() => {
    if (scroll) return
    const box = boxRef.current, track = trackRef.current
    if (!box || !track) return
    if (track.scrollHeight > box.clientHeight + 2) setScroll(true)
  })

  const list = scroll ? [...items, ...items] : items
  const duration = Math.max(8, items.length * 3)

  return (
    // `maxHeightPx` (from DashboardView, floor 352px ~6 rows, otherwise Balances' own measured
    // natural height) as an explicit style height — a pure-CSS flex-1/min-h combination can't
    // express this: a `flex-1` box's contribution to an ANCESTOR grid's natural-height comparison
    // (before any stretch is applied) falls back to its actual CONTENT height when nothing
    // upstream has a definite size yet, and `overflow-hidden`/`min-h` don't change that — with a
    // long enough transaction list, that content height is unbounded, which grew this whole card
    // to fit every row instead of staying matched to Balances. A real pixel height sidesteps the
    // ambiguity entirely: it IS this box's natural size, no measurement pass required.
    <div
      ref={boxRef}
      style={{ height: maxHeightPx }}
      className={`ticker-box scroll-fade overflow-hidden border-t border-white/10 light:border-black/10${scroll ? ' [mask-image:linear-gradient(to_bottom,black_calc(100%-24px),transparent)]' : ''}`}
      {...(scroll ? { tabIndex: 0, role: 'group', 'aria-label': 'Recent transactions, auto-scrolling — focus to pause' } : {})}
    >
      <div ref={trackRef} className={scroll ? 'ticker-track' : ''} style={scroll ? { animationDuration: `${duration}s` } : undefined}>
        {list.map((t, i) => (
          <div key={`${t.id}-${i}`} className={i >= items.length ? 'ticker-clone' : undefined} aria-hidden={i >= items.length || undefined}>
            <TransactionRow t={t} categories={categories} accounts={accounts} creditCards={creditCards} showMoney={showMoney} />
          </div>
        ))}
      </div>
    </div>
  )
}

// Glassy theme's cash-flow chart trades the bar chart's gridlines/axis for a glowing, floating-pill
// look (soft vertical beam + a white tooltip pill) — these two are its custom Tooltip pieces, kept
// out of DashboardView since they're plain render-prop components, not part of its own state/logic.
function GlassyCashflowCursor({ points, height }) {
  if (!points || !points.length) return null
  const x = points[0].x
  // `points[i].y` is each series' actual pixel y for this month (smaller y = higher value, since
  // SVG y grows downward) — the beam should run from the tallest of the two lines down to the
  // baseline, not the fixed full plot height, so its length actually reflects that month's data.
  const topY = Math.min(...points.map((p) => p.y))
  const beamHeight = Math.max(0, height - topY)
  return (
    <g>
      <defs>
        <linearGradient id="cashflowCursorBeam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity={0.4} />
          <stop offset="100%" stopColor="#c4b5fd" stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect x={x - 15} y={topY} width={30} height={beamHeight} rx={15} fill="url(#cashflowCursorBeam)" />
    </g>
  )
}
function GlassyCashflowTooltip({ active, payload, showMoney }) {
  if (!active || !payload || !payload.length) return null
  // The Bar and Line for the same field (e.g. "income") both report a payload entry — only one
  // combo chart's tooltip should end up per field, so keep just the first (the values agree).
  const seen = new Set()
  const deduped = payload.filter((p) => (seen.has(p.dataKey) ? false : (seen.add(p.dataKey), true)))
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-2 shadow-xl">
      {deduped.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: p.color }} />
          {showMoney ? money(p.value) : '••••'}
        </div>
      ))}
    </div>
  )
}

/* ---------------- Views ---------------- */
function DashboardView({ data, showMoney, onToggleMoney, onOpenTxForm, setView, onManageMoneyRules, onPayCardBill }) {
  const { profile, accounts, transactions, categories, holdings = [], loans = [], loan_payments = [], bucket_list = [], money_rules = [], credit_cards = [], portfolios = [], budget_months = [] } = data
  // Only the glassy theme gets the glowing area-chart treatment below — dark/light keep the plain
  // bar chart, so this doesn't touch either of their look.
  const { theme } = useTheme()
  const moduleSettings = resolveModuleSettings(profile)
  const widgets = resolveDashboardWidgets(profile)
  const totalBalance = accounts.reduce((s, a) => s + Number(a.current_balance || 0), 0)
  const invested = holdings.reduce((s, h) => s + Number(h.qty) * Number(h.avg_buy_price), 0)
  // Holdings-only figure, used for P&L — cash sitting un-invested in a portfolio has no P&L of
  // its own. `currentInv` below is the cash-inclusive total (real money either way), used for
  // net worth and the Portfolio tile's headline value, matching the Balances widget below it.
  const holdingsValue = holdings.reduce((s, h) => s + Number(h.qty) * Number(h.current_price || h.avg_buy_price), 0)
  const pnl = holdingsValue - invested
  const currentInv = holdingsValue + portfolios.reduce((s, p) => s + Number(p.cash_balance || 0), 0)
  // Same live figure (today's not-yet-billed interest included) the Loans module itself shows —
  // using the stale, as-of-last-payment `outstanding` here would make this number silently drift
  // from what the Loans page displays for the same loan.
  const totalOutstanding = loans.filter((l) => l.status !== 'closed').reduce((s, l) => s + liveOutstanding(l, loan_payments.filter((p) => p.loan_id === l.id)), 0)
  // Credit card outstanding is a real liability nothing else nets out — a card spend raises
  // current_outstanding without touching any account balance, so omitting it overstated net
  // worth by exactly the unpaid card balance. Ungated by the credit_cards module toggle, matching
  // how loans/investments are treated elsewhere on this screen (a module switch is UI-hide only).
  const creditCardDebt = credit_cards.reduce((s, c) => s + Number(c.current_outstanding || 0), 0)
  const totalAssets = totalBalance + currentInv
  const totalLiabilities = totalOutstanding + creditCardDebt
  const netWorth = totalAssets - totalLiabilities

  // Net worth detail page — same filters/formulas as the totals just above, so each section's
  // subtotal always reconciles exactly to totalBalance/currentInv/totalOutstanding/creditCardDebt.
  // Deliberately NOT gated by moduleSettings (unlike balanceItems below, which feeds the separate
  // "Accounts, cards & investments" Balances panel) — currentInv/creditCardDebt themselves are
  // computed ungated (see the comment above creditCardDebt), so hiding an item here because its
  // module is switched off would make this "how is this number really calculated" page lie about
  // money that's still silently counted in the headline figure.
  const [showNetWorthDetail, setShowNetWorthDetail] = useState(false)
  const cashBankItems = accounts.filter((a) => a.type !== 'debit_card').map((a) => ({
    id: `acc-${a.id}`, name: a.name, sub: a.type.replace('_', ' '), amount: Number(a.current_balance || 0),
    icon: a.type === 'cash' ? Wallet : Landmark, color: a.color || '#64748b', debt: false,
  }))
  const linkedPortfolioIds = new Set(portfolios.map((p) => p.id))
  const investmentItems = [
    ...portfolios.map((p) => {
      const value = holdings.filter((h) => h.portfolio_id === p.id).reduce((s, h) => s + Number(h.qty) * Number(h.current_price || h.avg_buy_price), 0) + Number(p.cash_balance || 0)
      return { id: `port-${p.id}`, name: p.name, sub: 'Investment', amount: value, icon: TrendingUp, color: p.color || '#64748b', debt: false }
    }),
    // A holding whose portfolio_id doesn't match any live portfolio (data anomaly) still gets a
    // row, so this section's subtotal keeps reconciling to currentInv exactly even then.
    ...(() => {
      const unlinkedValue = holdings.filter((h) => !linkedPortfolioIds.has(h.portfolio_id)).reduce((s, h) => s + Number(h.qty) * Number(h.current_price || h.avg_buy_price), 0)
      return unlinkedValue > 0 ? [{ id: 'port-unlinked', name: 'Unlinked holdings', sub: 'Investment', amount: unlinkedValue, icon: TrendingUp, color: '#64748b', debt: false }] : []
    })(),
  ]
  const loanItems = loans.filter((l) => l.status !== 'closed').map((l) => ({
    id: `loan-${l.id}`, name: l.name, sub: l.lender ? `Loan · ${l.lender}` : 'Loan',
    amount: liveOutstanding(l, loan_payments.filter((p) => p.loan_id === l.id)),
    icon: Landmark, color: '#fb7185', debt: true,
  }))
  const creditCardItems = credit_cards.map((c) => ({
    id: `cc-${c.id}`, name: c.name, sub: 'Credit card', amount: Number(c.current_outstanding || 0),
    icon: CreditCard, color: c.color || '#64748b', debt: true,
  }))

  // Drilldown state for the Income/Expense/Savings stat cards (StatDrilldown) — declared here,
  // above every early return in this component, same as every other hook below: React requires
  // every hook to run in the same order on every render, so none of these can sit after a
  // conditional `return` (that's exactly what broke when showNetWorthDetail's early return was
  // first added below the balances-overflow hooks — "fewer hooks than expected" at runtime).
  const [drilldown, setDrilldown] = useState(null)
  const [showDebtLoadInfo, setShowDebtLoadInfo] = useState(false)
  const [showRunwayInfo, setShowRunwayInfo] = useState(false)

  // Consolidated balances: bank accounts, credit cards (as debt), investment portfolios.
  // Debit cards are excluded — they share their linked account's balance, already listed here.
  // Credit card/portfolio line items only appear here while their module is switched on — a
  // module toggle is UI-hide only, so the underlying balances stay real, just not surfaced here.
  const balanceItems = [
    ...accounts.filter((a) => a.type !== 'debit_card').map((a) => ({
      id: `acc-${a.id}`, name: a.name, sub: a.type.replace('_', ' '), amount: Number(a.current_balance || 0),
      icon: a.type === 'cash' ? Wallet : Landmark, color: a.color || '#64748b', debt: false,
    })),
    ...(moduleSettings.credit_cards.enabled ? credit_cards.map((c) => ({
      id: `cc-${c.id}`, name: c.name, sub: 'Credit card', amount: Number(c.current_outstanding || 0),
      icon: CreditCard, color: c.color || '#64748b', debt: true,
    })) : []),
    ...(moduleSettings.investments.enabled ? portfolios.map((p) => {
      const value = holdings.filter((h) => h.portfolio_id === p.id).reduce((s, h) => s + Number(h.qty) * Number(h.current_price || h.avg_buy_price), 0) + Number(p.cash_balance || 0)
      return { id: `port-${p.id}`, name: p.name, sub: 'Investment', amount: value, icon: TrendingUp, color: p.color || '#64748b', debt: false }
    }) : []),
  ]

  // Detects real overflow (rather than always masking) so the fade only appears when there's
  // actually more content below — a short balance list's last row should stay fully opaque.
  const balancesRef = useRef(null)
  const balancesListInnerRef = useRef(null)
  const txHeaderRef = useRef(null)
  const leftColRef = useRef(null)
  const rightColRef = useRef(null)
  const [balancesOverflow, setBalancesOverflow] = useState(false)
  // Recent Transactions' ticker box targets a height that lands its card's bottom edge exactly on
  // Balances' bottom edge (floor 352px, ~6 rows, for whichever direction leaves it short).
  //
  // Two mechanisms cooperate here, and both are needed:
  //  1. This JS measurement sets the ticker's own pixel height so Transactions' card, from ITS
  //     OWN top, reaches Balances' true natural bottom — computed as `balancesListInnerRef`'s own
  //     top plus its own height, minus `txHeaderRef`'s bottom. This accounts for the two columns
  //     starting at different heights (the cash-flow chart and Money rules are rarely the same
  //     height) instead of assuming they match.
  //  2. `lg:flex-1` on both outer cards (CSS Grid's default stretch) is the fallback for when
  //     Balances' own natural content is shorter than Transactions' floor (very few
  //     accounts/cards/investments) — grid takes the taller natural column as the row height, and
  //     Balances' flex-1 grows it up to match, since #1 alone only ever shrinks Transactions
  //     toward Balances, never grows Balances itself.
  //
  // The critical detail in #1: it reads `balancesListInnerRef` (the unconstrained inner wrapper
  // around just the balance rows), never the outer Balances CARD's own rect. The outer card is
  // exactly what #2 stretches — measuring ITS bottom would mean reading a value that this same
  // effect had a hand in producing on the previous cycle, and feeding it back in as if it were
  // independent input. That shipped once: any sub-pixel rounding noise had nothing to damp it, so
  // it compounded every ResizeObserver tick — a slow, silent 1px-per-cycle growth with no error or
  // warning, visible only as the page continuously getting taller the longer it sat open. The
  // inner list wrapper has no height of its own to inherit from a stretch decision made downstream
  // of it, so it always reports Balances' real, stable content size.
  //
  // A ResizeObserver on both column wrappers (not a one-shot effect keyed on item count) keeps
  // this correct continuously — a web font swap, an icon loading late, or Money rules/Balances
  // changing size for any reason all re-trigger it, not just a change in how many rows there are.
  const [recentTxMaxHeight, setRecentTxMaxHeight] = useState(352)
  useLayoutEffect(() => {
    const scrollEl = balancesRef.current
    const update = () => {
      if (scrollEl) setBalancesOverflow(scrollEl.scrollHeight > scrollEl.clientHeight + 2)
      const listEl = balancesListInnerRef.current
      const txHeaderBottom = txHeaderRef.current?.getBoundingClientRect().bottom
      if (!listEl || txHeaderBottom == null) return
      const balNaturalBottom = listEl.getBoundingClientRect().top + listEl.offsetHeight
      setRecentTxMaxHeight(Math.max(352, balNaturalBottom - txHeaderBottom))
    }
    update()
    const observer = new ResizeObserver(update)
    if (leftColRef.current) observer.observe(leftColRef.current)
    if (rightColRef.current) observer.observe(rightColRef.current)
    return () => observer.disconnect()
  }, [balanceItems.length])

  if (showNetWorthDetail) {
    return (
      <NetWorthDetailView
        onBack={() => setShowNetWorthDetail(false)}
        showMoney={showMoney}
        setView={setView}
        netWorth={netWorth} totalAssets={totalAssets} totalLiabilities={totalLiabilities}
        totalBalance={totalBalance} currentInv={currentInv} totalOutstanding={totalOutstanding} creditCardDebt={creditCardDebt}
        cashBankItems={cashBankItems} investmentItems={investmentItems} loanItems={loanItems} creditCardItems={creditCardItems}
        investmentsModuleEnabled={moduleSettings.investments.enabled}
        creditCardsModuleEnabled={moduleSettings.credit_cards.enabled}
      />
    )
  }

  // Monthly aggregation for last 6 months
  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: monthName(d), income: 0, expense: 0, invested: 0 }) }
  transactions.forEach((t) => {
    if (t.type === 'transfer') return
    const d = new Date(t.date); const key = `${d.getFullYear()}-${d.getMonth()}`
    const bucket = months.find((m) => m.key === key)
    if (!bucket) return
    bucket[t.type] += Number(t.amount || 0)
    // Funding a portfolio posts as a real expense transaction (so the source account's balance
    // is correct) tagged linked_module: 'investment' — without this, money moved into investing
    // reads as if it were spent, understating savings by exactly what was actually still saved.
    if (t.type === 'expense' && t.linked_module === 'investment') bucket.invested += Number(t.amount || 0)
  })
  const thisMonth = months[months.length - 1]
  const investedThisMonth = thisMonth?.invested || 0
  const cashSavingsThisMonth = (thisMonth?.income || 0) - (thisMonth?.expense || 0)
  const savingsRate = thisMonth?.income > 0 ? Math.round(((cashSavingsThisMonth + investedThisMonth) / thisMonth.income) * 100) : 0

  // Life-to-date and this-year totals, for the Income/Expense/Savings stat cards' drill-down —
  // those three cards default to the current month same as everywhere else in this app; tapping
  // one opens a StatDrilldown showing the same figures with no period cutoff (or, for Savings,
  // this year's investment/cash split specifically, per how the user actually wants that one read).
  const thisYear = now.getFullYear()
  const allTime = { income: 0, expense: 0, invested: 0 }
  const yearTotals = { income: 0, expense: 0, invested: 0 }
  transactions.forEach((t) => {
    if (t.type === 'transfer') return
    const amt = Number(t.amount || 0)
    allTime[t.type] += amt
    if (t.type === 'expense' && t.linked_module === 'investment') allTime.invested += amt
    if (new Date(t.date).getFullYear() === thisYear) {
      yearTotals[t.type] += amt
      if (t.type === 'expense' && t.linked_module === 'investment') yearTotals.invested += amt
    }
  })
  const allTimeSaved = (allTime.income - allTime.expense) + allTime.invested
  const yearCashSavings = yearTotals.income - yearTotals.expense
  const nowMonthKey = `${now.getFullYear()}-${now.getMonth()}`
  const allThisMonth = transactions.filter((t) => {
    const d = new Date(t.date)
    return `${d.getFullYear()}-${d.getMonth()}` === nowMonthKey
  })
  const recent = allThisMonth.slice(0, 15)

  // Extra stat-card figures — each gated behind its own Settings > Dashboard toggle, off by
  // default except the original four, so turning them on is opt-in rather than new clutter.
  const netCashflow = (thisMonth?.income || 0) - (thisMonth?.expense || 0)
  const totalDebt = (moduleSettings.loans.enabled ? totalOutstanding : 0) + (moduleSettings.credit_cards.enabled ? creditCardDebt : 0)
  const avgMonthlySpend = months.length ? months.reduce((s, m) => s + m.expense, 0) / months.length : 0
  // Assets and liabilities share one horizontal scale so the two bars are directly comparable —
  // the length difference between them IS net worth, drawn to scale. A longer liabilities bar
  // makes a negative net worth legible at a glance instead of requiring mental subtraction.
  const nwScale = Math.max(totalAssets, totalLiabilities, 1)
  const nwPct = (v) => `${Math.max(0, (Number(v) / nwScale) * 100)}%`
  const hasNetWorthDetail = totalAssets > 0 || totalLiabilities > 0
  // Both are ratios, not rupee amounts, so they stay visible under the privacy toggle — same
  // treatment savingsRate/creditUtilizationPct/budgetUsedPct already get on this screen.
  // null only when there's truly no debt to measure (0 liabilities) — real debt against
  // zero-or-negative assets is the most over-leveraged state possible, not an unknown one, so
  // that case renders as a capped 999 ("100%+") below rather than falling back to null/"—".
  const debtLoadPct = totalLiabilities <= 0 ? 0 : totalAssets > 0 ? Math.round((totalLiabilities / totalAssets) * 100) : 999
  const runwayMonths = avgMonthlySpend > 0 ? totalBalance / avgMonthlySpend : null
  const spendByCategory = {}
  allThisMonth.filter((t) => t.type === 'expense').forEach((t) => {
    const key = t.category_id || 'none'
    spendByCategory[key] = (spendByCategory[key] || 0) + Number(t.amount || 0)
  })
  const topCategoryEntry = Object.entries(spendByCategory).sort((a, b) => b[1] - a[1])[0]
  const topCategory = topCategoryEntry ? { name: categories.find((c) => c.id === topCategoryEntry[0])?.name || 'Uncategorized', amount: topCategoryEntry[1] } : null
  const creditLimitSum = credit_cards.reduce((s, c) => s + Number(c.credit_limit || 0), 0)
  const creditUtilizationPct = creditLimitSum > 0 ? Math.round((creditCardDebt / creditLimitSum) * 100) : 0
  const currentBudgetPlan = budget_months.find((p) => p.year === now.getFullYear() && p.month === now.getMonth() && p.status === 'active')
  const budgetTotal = Number(currentBudgetPlan?.total_amount || 0)
  const budgetUsedPct = budgetTotal > 0 ? Math.round(((thisMonth?.expense || 0) / budgetTotal) * 100) : 0

  // showMoney masking rule for this array: *currency* figures mask to '••••'; derived ratios and
  // counts (savings rate, credit utilisation, budget used, transaction count) stay visible — they
  // disclose no absolute amount, and the toggle's own label is "Hide amounts". Keep new cards
  // consistent with this split.
  const STAT_CARDS = [
    { key: 'income_month', available: true, node: <StatCard label={`Income · ${thisMonth?.label || ''}`} value={showMoney ? money(thisMonth?.income || 0) : '••••'} sub={<span className="flex items-center gap-1"><ArrowUpRight size={13} aria-hidden="true" /><span className="sr-only">Money in · </span><span className="hidden sm:inline">This month · tap for all-time</span><span className="sm:hidden">Tap for all-time</span></span>} icon={TrendingUp} accent="bg-emerald-400/15 text-emerald-200 light:text-emerald-700" onClick={() => setDrilldown('income')} /> },
    { key: 'expense_month', available: true, node: <StatCard label={`Expense · ${thisMonth?.label || ''}`} value={showMoney ? money(thisMonth?.expense || 0) : '••••'} sub={<span className="flex items-center gap-1 text-rose-300 light:text-rose-700"><ArrowDownRight size={13} aria-hidden="true" /><span className="sr-only">Money out · </span><span className="hidden sm:inline">This month · tap for all-time</span><span className="sm:hidden">Tap for all-time</span></span>} icon={TrendingDown} accent="bg-rose-400/15 text-rose-200 light:text-rose-700" tone="text-rose-300 light:text-rose-700" onClick={() => setDrilldown('expense')} /> },
    { key: 'savings_rate', available: true, node: <StatCard label="Savings rate" value={`${savingsRate}%`} sub={<span className={savingsRate >= 20 ? 'text-emerald-300 light:text-emerald-700' : 'text-amber-300 light:text-amber-700'}>{savingsRate >= 20 ? 'Great pace' : 'Aim for 20%+'} · tap for detail</span>} icon={Target} accent="bg-accent-400/15 text-accent-200 light:text-accent-700" tone={savingsRate >= 20 ? 'text-emerald-300 light:text-emerald-700' : 'text-amber-300 light:text-amber-700'} onClick={() => setDrilldown('savings')} /> },
    { key: 'net_cashflow', available: true, node: <StatCard label="Net cash flow" value={showMoney ? money(netCashflow) : '••••'} sub={<span className={netCashflow >= 0 ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700'}>{netCashflow >= 0 ? 'Positive' : 'Negative'} this month</span>} icon={ArrowLeftRight} accent="bg-accent-400/15 text-accent-200 light:text-accent-700" tone={netCashflow >= 0 ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700'} /> },
    { key: 'total_debt', available: moduleSettings.loans.enabled || moduleSettings.credit_cards.enabled, node: <StatCard label="Total debt" value={showMoney ? money(totalDebt) : '••••'} sub="Loans + credit cards" icon={CreditCard} accent="bg-rose-400/15 text-rose-200 light:text-rose-700" /> },
    { key: 'total_invested', available: moduleSettings.investments.enabled, node: <StatCard label="Total invested" value={showMoney ? money(currentInv) : '••••'} sub={<span className={pnl >= 0 ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700'}><span className="sr-only">{pnl >= 0 ? 'Profit ' : 'Loss '}</span>{pnl >= 0 ? '+' : '−'}{showMoney ? money(pnl).replace('-', '') : '••••'} P&amp;L</span>} icon={TrendingUp} accent="bg-accent-400/15 text-accent-200 light:text-accent-700" /> },
    { key: 'avg_monthly_spend', available: true, node: <StatCard label="Avg. monthly spend" value={showMoney ? money(avgMonthlySpend) : '••••'} sub="Last 6 months" icon={BarChart3} accent="bg-amber-400/15 text-amber-200 light:text-amber-700" /> },
    { key: 'transactions_count', available: true, node: <StatCard label="Transactions" value={String(allThisMonth.length)} sub="This month" icon={ListChecks} accent="bg-accent-400/15 text-accent-200 light:text-accent-700" /> },
    { key: 'top_category', available: !!topCategory, node: topCategory && <StatCard label="Top category" value={topCategory.name} sub={showMoney ? money(topCategory.amount) : '••••'} icon={Tag} accent="bg-accent-400/15 text-accent-200 light:text-accent-700" /> },
    { key: 'credit_utilization', available: moduleSettings.credit_cards.enabled && credit_cards.length > 0, node: <StatCard label="Credit utilization" value={`${creditUtilizationPct}%`} sub={creditUtilizationPct >= 70 ? 'Getting high' : 'Under control'} icon={PieChartIcon} accent="bg-rose-400/15 text-rose-200 light:text-rose-700" tone={creditUtilizationPct >= 70 ? 'text-rose-300 light:text-rose-700' : 'text-emerald-300 light:text-emerald-700'} /> },
    { key: 'budget_used_pct', available: moduleSettings.budgets.enabled && budgetTotal > 0, node: <StatCard label="Budget used" value={`${budgetUsedPct}%`} sub={budgetUsedPct > 100 ? 'Over budget' : 'On track'} icon={Zap} accent="bg-accent-400/15 text-accent-200 light:text-accent-700" tone={budgetUsedPct > 100 ? 'text-rose-300 light:text-rose-700' : 'text-emerald-300 light:text-emerald-700'} /> },
  ].filter((s) => widgets[s.key]?.enabled && s.available)

  const showPortfolioTile = moduleSettings.investments.enabled && holdings.length > 0
  const showLoansTile = moduleSettings.loans.enabled && loans.length > 0
  const showBucketTile = moduleSettings.bucket_list.enabled && bucket_list.length > 0

  // Same {key, node} shape as STAT_CARDS so both groups can flow through one shared grid below —
  // stats and quick tiles used to render as two separate rows, which meant an odd stat-card count
  // left its own row half-empty even after the auto-fit fix, independent of how much room the
  // tiles row had free right below it. One combined row lets every enabled card (stat or tile)
  // share the same width budget.
  const QUICK_TILE_CARDS = [
    {
      key: 'portfolio_tile', available: widgets.quick_tiles.enabled && showPortfolioTile, node: (
        <StatCard
          onClick={() => setView('investments')}
          label="Portfolio"
          value={showMoney ? money(currentInv) : '••••'}
          sub={<span><span className="sr-only">{pnl >= 0 ? 'Profit ' : 'Loss '}</span>{pnl >= 0 ? '+' : '−'}{showMoney ? money(pnl).replace('-', '') : '••••'} P&amp;L</span>}
          icon={TrendingUp}
          accent="bg-accent-400/15 text-accent-200 light:text-accent-700"
          tone={pnl >= 0 ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700'}
        />
      ),
    },
    {
      key: 'loans_tile', available: widgets.quick_tiles.enabled && showLoansTile, node: (
        <StatCard
          onClick={() => setView('loans')}
          label="Loans outstanding"
          value={showMoney ? money(totalOutstanding) : '••••'}
          sub={`${loans.filter((l) => l.status !== 'closed').length} active loan${loans.filter((l) => l.status !== 'closed').length === 1 ? '' : 's'}`}
          icon={Briefcase}
          accent="bg-amber-400/15 text-amber-200 light:text-amber-700"
          tone="text-slate-400 light:text-slate-500"
        />
      ),
    },
    {
      key: 'bucket_tile', available: widgets.quick_tiles.enabled && showBucketTile, node: (
        <StatCard
          onClick={() => setView('bucket')}
          label="Bucket list"
          value={`${bucket_list.length} item${bucket_list.length === 1 ? '' : 's'}`}
          sub={`${bucket_list.filter((b) => (Date.now() - new Date(b.created_at).getTime()) / 86400000 >= 30).length} past 30 days`}
          icon={Mountain}
          accent="bg-accent-400/15 text-accent-200 light:text-accent-700"
          tone="text-slate-400 light:text-slate-500"
        />
      ),
    },
  ].filter((t) => t.available)

  // Combined so stats and quick tiles share one row instead of two — see QUICK_TILE_CARDS above.
  // Savings rate is desktop-only (see the render below): mobile drops it and shows the remaining
  // cards 2-per-row instead.
  const ALL_CARDS = [...STAT_CARDS, ...QUICK_TILE_CARDS]

  // Which 3 actions sit in the net-worth card's mobile quick-action row is user-configurable
  // (Settings > Mobile nav) — same mechanism as the bottom nav's primary slots. 'add' is a
  // special action (opens the transaction form) rather than a real destination; everything else
  // just navigates. Unmodified profiles keep today's default (Add/Ledger/Accounts).
  const quickActionDestinations = [
    ADD_ACTION_META, MOBILE_MANDATORY_META.transactions, MOBILE_MANDATORY_META.accounts,
    ...orderedEnabledKeys(moduleSettings).filter((k) => NAV_META[k]).map((k) => NAV_META[k]),
  ]
  const quickActionSlots = resolveQuickActionSlots(profile, quickActionDestinations.map((d) => d.key))
  const quickActionItems = quickActionSlots.map((key) => quickActionDestinations.find((d) => d.key === key)).filter(Boolean)

  return (
    <>
    <div className="flex min-h-full flex-col gap-3">
      {widgets.credit_card_alert.enabled && moduleSettings.credit_cards.enabled && (
        <CreditCardBillAlert creditCards={credit_cards} transactions={transactions} onPay={onPayCardBill} showMoney={showMoney} />
      )}

      {widgets.net_worth?.enabled && (
        <div className="relative shrink-0 rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] p-6 lg:grid lg:grid-cols-[minmax(300px,1.05fr)_minmax(0,1.5fr)] lg:items-center lg:gap-8 xl:grid-cols-[minmax(300px,1fr)_minmax(0,1.5fr)_minmax(0,0.75fr)] glassy:glass-hero">
          {/* Mobile-only — desktop keeps the header's own toggle, which has room to spare */}
          <button
            type="button"
            onClick={onToggleMoney}
            aria-label={showMoney ? 'Hide amounts' : 'Show amounts'}
            aria-pressed={!showMoney}
            title={showMoney ? 'Hide amounts' : 'Show amounts'}
            className="absolute right-4 top-4 rounded-lg border border-white/10 light:border-black/10 p-1.5 text-slate-400 light:text-slate-500 hover:bg-white/5 lg:hidden"
          >
            {showMoney ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs uppercase tracking-widest text-slate-400 light:text-slate-500">Net worth</h2>
              <button
                type="button"
                onClick={() => setShowNetWorthDetail(true)}
                title="How is this calculated?"
                aria-label="How is net worth calculated?"
                className="rounded-lg p-1 text-slate-500 transition hover:bg-white/5 hover:text-white hover:light:bg-black/5 hover:light:text-slate-900"
              >
                <Calculator size={13} />
              </button>
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <div className={`text-[clamp(2rem,6vw,3rem)] font-semibold leading-[1.1] tracking-[-0.01em] ${netWorth < 0 ? 'text-rose-200 light:text-rose-700' : 'text-white light:text-slate-900'}`}>
                {showMoney ? `${netWorth < 0 ? '−' : ''}${money(netWorth).replace('-', '')}` : '••••••••'}
              </div>
              {netWorth < 0 && (
                <span className="rounded-full border border-rose-300/30 bg-rose-300/5 px-2 py-0.5 text-[11px] font-semibold text-rose-200 light:text-rose-700">
                  Net negative
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="text-slate-400 light:text-slate-500">Net cash flow · {thisMonth?.label || 'this month'}</span>
              <span className={`font-semibold ${netCashflow >= 0 ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700'}`}>
                <span className="sr-only">{netCashflow >= 0 ? 'Up ' : 'Down '}</span>
                {netCashflow >= 0 ? '+' : '−'}{showMoney ? money(Math.abs(netCashflow)).replace('-', '') : '••••'}
              </span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 lg:hidden">
              {quickActionItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => (item.key === 'add' ? onOpenTxForm() : setView(item.key))}
                  className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[.04] light:bg-black/[.03] py-3 text-xs text-slate-300 light:text-slate-700 transition hover:bg-white/[.08] hover:light:bg-black/[.05] active:scale-[.97] glassy:glass-pill"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${item.key === 'add' ? 'bg-accent-400/15 text-accent-200 light:text-accent-700' : 'bg-white/[.06] light:bg-black/[.04] text-slate-200 light:text-slate-600'}`}><item.icon size={18} /></div>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden min-w-0 border-white/[.07] light:border-black/[.07] lg:flex lg:flex-col lg:justify-center lg:gap-2.5 lg:border-l lg:pl-8">
            {!hasNetWorthDetail ? (
              <div className="text-sm text-slate-400 light:text-slate-500">
                Nothing tracked yet.{' '}
                <button onClick={() => setView('accounts')} className="text-accent-300 light:text-accent-700 hover:underline">Add an account</button>{' '}
                to see what your net worth is made of.
              </div>
            ) : (
              <>
                <div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 light:text-slate-500">Assets</span>
                    <span className="text-sm font-semibold text-white light:text-slate-900">{showMoney ? money(totalAssets) : '••••'}</span>
                  </div>
                  <div
                    role="img"
                    aria-label={showMoney ? `Assets ${money(totalAssets)}: cash and bank ${money(totalBalance)}, investments ${money(currentInv)}` : 'Assets breakdown, amounts hidden'}
                    className="mt-1.5 flex h-2 gap-px overflow-hidden rounded-full bg-white/[.07] light:bg-black/[.07]"
                  >
                    <div className="bg-emerald-400" style={{ width: nwPct(totalBalance) }} />
                    <div className="bg-emerald-400/50" style={{ width: nwPct(currentInv) }} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-400 light:text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />Cash &amp; bank {showMoney ? money(totalBalance) : '••••'}</span>
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/50" />Investments {showMoney ? money(currentInv) : '••••'}</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 light:text-slate-500">Liabilities</span>
                    <span className="text-sm font-semibold text-white light:text-slate-900">{showMoney ? money(totalLiabilities) : '••••'}</span>
                  </div>
                  <div
                    role="img"
                    aria-label={showMoney ? `Liabilities ${money(totalLiabilities)}: loans ${money(totalOutstanding)}, credit cards ${money(creditCardDebt)}` : 'Liabilities breakdown, amounts hidden'}
                    className="mt-1.5 flex h-2 gap-px overflow-hidden rounded-full bg-white/[.07] light:bg-black/[.07]"
                  >
                    <div className="bg-rose-400" style={{ width: nwPct(totalOutstanding) }} />
                    <div className="bg-rose-400/50" style={{ width: nwPct(creditCardDebt) }} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-400 light:text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />Loans {showMoney ? money(totalOutstanding) : '••••'}</span>
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400/50" />Cards {showMoney ? money(creditCardDebt) : '••••'}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="hidden border-white/[.07] light:border-black/[.07] xl:flex xl:flex-col xl:justify-center xl:gap-3 xl:border-l xl:pl-8">
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 light:text-slate-500">Cash runway</span>
                <button
                  type="button"
                  onClick={() => setShowRunwayInfo(true)}
                  title="What does this mean?"
                  aria-label="What does Cash runway mean?"
                  className="rounded-full p-0.5 text-slate-500 transition hover:bg-white/5 hover:text-white hover:light:bg-black/5 hover:light:text-slate-900"
                >
                  <Info size={12} />
                </button>
              </div>
              <div className="mt-0.5 text-xl font-semibold leading-tight text-white light:text-slate-900">
                {runwayMonths === null ? '—' : <>{runwayMonths > 99 ? '99+' : runwayMonths.toFixed(1)}<span className="ml-1 text-sm font-medium text-slate-400 light:text-slate-500">mo of avg. spend</span></>}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 light:text-slate-500">Debt load</span>
                <button
                  type="button"
                  onClick={() => setShowDebtLoadInfo(true)}
                  title="What does this mean?"
                  aria-label="What does Debt load mean?"
                  className="rounded-full p-0.5 text-slate-500 transition hover:bg-white/5 hover:text-white hover:light:bg-black/5 hover:light:text-slate-900"
                >
                  <Info size={12} />
                </button>
              </div>
              <div className={`mt-0.5 text-xl font-semibold leading-tight ${debtLoadPct >= 100 ? 'text-rose-300 light:text-rose-700' : debtLoadPct >= 60 ? 'text-amber-300 light:text-amber-700' : 'text-emerald-300 light:text-emerald-700'}`}>
                {debtLoadPct >= 999 ? '100+' : debtLoadPct}<span className="ml-1 text-sm font-medium text-slate-400 light:text-slate-500">% of assets owed</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {ALL_CARDS.length > 0 && (
        // auto-fit (not auto-fill) collapses empty tracks and lets 1fr redistribute their space
        // to the real cards instead — so cards that could fit more columns than exist stretch to
        // fill the row evenly, rather than leaving a permanently empty trailing cell. The 150px
        // minimum is the width these cards already render comfortably at on a phone (2-per-row).
        <div className="grid shrink-0 grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          {ALL_CARDS.map((s) => (
            // Savings rate is desktop-only — mobile shows the other cards 2-per-row instead.
            <div key={s.key} className={`min-w-0${s.key === 'savings_rate' ? ' hidden lg:block' : ''}`}>{s.node}</div>
          ))}
        </div>
      )}

      {/*
        Both columns still use the grid's default stretch (`lg:flex-1` on the last card in each) —
        see the long comment on `recentTxMaxHeight` above for why that no longer fights the JS
        height computation the way it used to. Mobile collapses to one column via plain stacking;
        within the right column, Balances is placed before Money rules in the DOM so mobile shows
        Balances first, then `lg:order-first` on Money rules pulls it back to the top for desktop.
      */}
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1.4fr_1fr]">
        <div ref={leftColRef} className="flex min-h-0 flex-col gap-3">
          {widgets.cashflow_chart.enabled && (
            <div className="shrink-0 rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-3.5">
              <div className="mb-1 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white light:text-slate-900">Cash flow · last 6 months</h2>
                  <div className="text-xs text-slate-400 light:text-slate-500">{showMoney ? 'Income vs expense' : 'Income vs expense · amounts hidden'}</div>
                </div>
                <BarChart3 size={16} className="text-slate-500" aria-hidden="true" />
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  {/* With showMoney off the axis ticks and tooltip mask to '••••', but the bars/lines
                      keep their real relative heights — the shape of the month-over-month trend is a
                      known, accepted residual leak. Masking it would mean either faking the user's
                      own data or hiding the chart outright, neither of which matches how every
                      other masked figure on this dashboard behaves. */}
                  {theme === 'glassy' ? (
                    // Bars gave each month a hover highlight that's the same fixed width for every
                    // category slot regardless of that month's own value — reads as "generic",
                    // not tied to the specific month. A pure area/line keeps the highlight (the
                    // beam below) anchored to the hovered point's real x position instead.
                    <AreaChart data={months}>
                      <defs>
                        <linearGradient id="cashflowIncomeGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34d399" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="cashflowExpenseGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fb7185" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => (showMoney ? `₹${(v / 1000).toFixed(0)}k` : '••••')} />
                      <Tooltip content={<GlassyCashflowTooltip showMoney={showMoney} />} cursor={<GlassyCashflowCursor />} />
                      <Area
                        type="monotone" dataKey="income" stroke="#34d399" strokeWidth={2.5} fill="url(#cashflowIncomeGlow)"
                        dot={false} activeDot={{ r: 5, fill: '#0b0f17', stroke: '#34d399', strokeWidth: 2 }}
                        style={{ filter: 'drop-shadow(0 0 6px rgba(52,211,153,.5))' }}
                      />
                      <Area
                        type="monotone" dataKey="expense" stroke="#fb7185" strokeWidth={2.5} fill="url(#cashflowExpenseGlow)"
                        dot={false} activeDot={{ r: 5, fill: '#0b0f17', stroke: '#fb7185', strokeWidth: 2 }}
                        style={{ filter: 'drop-shadow(0 0 6px rgba(251,113,133,.5))' }}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={months}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff11" />
                      <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => (showMoney ? `₹${(v / 1000).toFixed(0)}k` : '••••')} />
                      <Tooltip cursor={{ fill: '#ffffff08' }} contentStyle={{ background: '#0f1420', border: '1px solid #ffffff22', borderRadius: 12, color: '#fff' }} formatter={(v) => (showMoney ? money(v) : '••••')} />
                      <Legend iconType="circle" wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                      <Bar dataKey="income" fill="#34d399" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="expense" fill="#fb7185" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
              {theme === 'glassy' && (
                <div className="mt-1 flex items-center justify-center gap-4">
                  <span className="flex items-center gap-1.5 text-xs text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Income</span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-rose-400" />Expense</span>
                </div>
              )}
            </div>
          )}

          {/* Desktop-only — mobile has its own bottom-nav "Ledger" tab for browsing transactions,
              so this doesn't need to also live on the dashboard there. */}
          {widgets.recent_transactions.enabled && (
            // The ticker's own height (`recentTxMaxHeight`) is computed to match Balances' actual
            // bottom edge — `lg:flex-1` here is just the shared-stretch fallback (see the comment
            // on `recentTxMaxHeight` above), not the primary mechanism.
            <div className="hidden rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card lg:flex lg:flex-col lg:flex-1">
              <div ref={txHeaderRef} className="flex shrink-0 items-center justify-between px-3.5 py-2.5">
                <div>
                  <h2 className="text-sm font-semibold text-white light:text-slate-900">Recent transactions</h2>
                  <div className="text-xs text-slate-400 light:text-slate-500">{thisMonth?.label || 'This month'}'s activity</div>
                </div>
                <button onClick={() => setView('transactions')} className="text-xs text-accent-300 light:text-accent-700 hover:underline">See all</button>
              </div>
              {recent.length === 0 ? (
                <EmptyState compact icon={Wallet} title="No transactions yet" message="Log your first income or expense to see it here." cta="Add transaction" onCta={onOpenTxForm} />
              ) : (
                <TransactionTicker items={recent} categories={categories} accounts={accounts} creditCards={credit_cards} showMoney={showMoney} maxHeightPx={recentTxMaxHeight} />
              )}
            </div>
          )}
        </div>

        <div ref={rightColRef} className="flex min-h-0 flex-col gap-3">
          {widgets.balances_panel.enabled && (
            // Mobile: no height cap — it grows to show every account (no other bottom-nav view
            // shows balances there). Desktop: `lg:flex-1` only kicks in when this card's own
            // natural content is shorter than Transactions' floor (very few balance items) — see
            // the comment on `recentTxMaxHeight` above.
            <div className="flex min-h-[160px] min-w-0 flex-col rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-3.5 lg:flex-1">
              <div className="mb-2 flex shrink-0 items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white light:text-slate-900">Balances</h2>
                  <div className="text-xs text-slate-400 light:text-slate-500">Accounts, cards &amp; investments</div>
                </div>
                <button onClick={() => setView('accounts')} className="text-xs text-accent-300 light:text-accent-700 hover:underline">Manage</button>
              </div>
              {balanceItems.length === 0 ? (
                <EmptyState compact icon={Landmark} title="Nothing tracked yet" message="Add an account, card, or portfolio to see balances here." cta="Add account" onCta={() => setView('accounts')} />
              ) : (
                <div
                  ref={balancesRef}
                  className={`scroll-fade min-h-0 flex-1 overflow-y-auto${balancesOverflow ? ' [mask-image:linear-gradient(to_bottom,black_calc(100%-28px),transparent)]' : ''}`}
                >
                  <div ref={balancesListInnerRef} className="space-y-2">
                    {balanceItems.map((it) => (
                      <div key={it.id} className="flex items-center justify-between rounded-xl border border-white/5 light:border-black/5 bg-white/[.07] light:bg-black/[.07] px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${it.color}22`, color: it.color }}>
                            <it.icon size={14} />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-white light:text-slate-900">{it.name}</div>
                            <div className="truncate text-[11px] capitalize text-slate-400 light:text-slate-500">{it.sub}</div>
                          </div>
                        </div>
                        <div className={`shrink-0 text-sm font-semibold ${it.debt ? 'text-rose-300 light:text-rose-700' : 'text-white light:text-slate-900'}`}>{showMoney ? `${it.debt ? '−' : ''}${money(it.amount).replace('-', '')}` : '••••'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {widgets.money_rules_widget.enabled && (
            <div className="shrink-0 lg:order-first">
              <MoneyRulesWidget rules={money_rules} onOpen={onManageMoneyRules} />
            </div>
          )}
        </div>
      </div>
    </div>

    <StatDrilldown
      open={drilldown === 'income'}
      onClose={() => setDrilldown(null)}
      title="Income"
      icon={TrendingUp}
      accent="bg-emerald-400/15 text-emerald-200 light:text-emerald-700"
      rows={[
        { label: thisMonth?.label || 'This month', value: showMoney ? money(thisMonth?.income || 0) : '••••' },
        { label: `${thisYear} so far`, value: showMoney ? money(yearTotals.income) : '••••' },
        { label: 'All-time', value: showMoney ? money(allTime.income) : '••••' },
      ]}
    />
    <StatDrilldown
      open={drilldown === 'expense'}
      onClose={() => setDrilldown(null)}
      title="Expense"
      icon={TrendingDown}
      accent="bg-rose-400/15 text-rose-200 light:text-rose-700"
      rows={[
        { label: thisMonth?.label || 'This month', value: showMoney ? money(thisMonth?.expense || 0) : '••••' },
        { label: `${thisYear} so far`, value: showMoney ? money(yearTotals.expense) : '••••' },
        { label: 'All-time', value: showMoney ? money(allTime.expense) : '••••' },
      ]}
      note="Includes money moved into investments — see Savings for the cash-vs-invested split."
    />
    <StatDrilldown
      open={drilldown === 'savings'}
      onClose={() => setDrilldown(null)}
      title="Savings"
      icon={Target}
      accent="bg-accent-400/15 text-accent-200 light:text-accent-700"
      rows={[
        { label: 'Invested this year', sub: 'Money moved into portfolios', value: showMoney ? money(yearTotals.invested) : '••••', tone: 'text-accent-300 light:text-accent-700' },
        { label: 'Other savings this year', sub: 'Cash kept, not invested or spent', value: showMoney ? money(yearCashSavings) : '••••' },
        { label: `Total set aside · ${thisYear}`, value: showMoney ? money(yearCashSavings + yearTotals.invested) : '••••', tone: 'text-emerald-300 light:text-emerald-700' },
        { label: 'All-time saved + invested', value: showMoney ? money(allTimeSaved) : '••••' },
      ]}
      note="Savings rate now counts what you invested this month as saved, not spent — investing no longer drags the rate down."
    />
    <StatDrilldown
      open={showDebtLoadInfo}
      onClose={() => setShowDebtLoadInfo(false)}
      title="Debt load"
      icon={Info}
      accent="bg-rose-400/15 text-rose-200 light:text-rose-700"
      body="What percentage of everything you own is owed to someone else — your total debt (loans + credit cards) divided by your total assets (cash + investments)."
      rows={[
        { label: 'Total liabilities', value: showMoney ? money(totalLiabilities) : '••••' },
        { label: 'Total assets', value: showMoney ? money(totalAssets) : '••••' },
        { label: 'Debt load', value: debtLoadPct >= 999 ? '100+%' : `${debtLoadPct}%`, tone: debtLoadPct >= 100 ? 'text-rose-300 light:text-rose-700' : debtLoadPct >= 60 ? 'text-amber-300 light:text-amber-700' : 'text-emerald-300 light:text-emerald-700' },
      ]}
      note={totalAssets <= 0 && totalLiabilities > 0
        ? '"100+%" here specifically means you currently have ~₹0 or less in assets while still carrying real debt — not a display error, your liabilities genuinely outweigh everything you own right now.'
        : 'Above 100% means your debts are worth more than everything you own — a negative net worth. That\'s a real, correct read of your numbers, not a bug.'}
    />
    <StatDrilldown
      open={showRunwayInfo}
      onClose={() => setShowRunwayInfo(false)}
      title="Cash runway"
      icon={Info}
      accent="bg-accent-400/15 text-accent-200 light:text-accent-700"
      body="How many months your current cash & bank balance would last, purely at your average monthly spending pace over the last 6 months. It's not a prediction — it doesn't account for income still coming in, so it reads more pessimistic than reality if you have regular income."
      rows={[
        { label: 'Cash & bank balance', value: showMoney ? money(totalBalance) : '••••' },
        { label: 'Avg. monthly spend', sub: 'Last 6 months', value: showMoney ? money(avgMonthlySpend) : '••••' },
        { label: 'Runway', value: runwayMonths === null ? '—' : `${runwayMonths > 99 ? '99+' : runwayMonths.toFixed(1)} months` },
      ]}
      note={runwayMonths === null
        ? 'Shows "—" because no expenses were recorded in the last 6 months — there\'s no spending pace yet to divide your balance by.'
        : null}
    />
    </>
  )
}

// A quick look at a transaction's receipt without going through the edit form — fetches a
// short-lived signed URL (the storage bucket is private) and renders it inline: an image shows
// directly, a PDF renders in an iframe, anything else just offers a straight-through open link.
function AttachmentViewer({ open, onClose, transaction }) {
  const [url, setUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  useEffect(() => {
    if (!open || !transaction) return
    setLoading(true); setUrl(null)
    fetch(`/api/finance/transactions/${transaction.id}/attachment`)
      .then((r) => r.json())
      .then((d) => setUrl(d.url || null))
      .finally(() => setLoading(false))
  }, [open, transaction])
  if (!open) return null
  const name = transaction?.attachment_name || ''
  const isImage = /\.(png|jpe?g|gif|webp|bmp)$/i.test(name)
  const isPdf = /\.pdf$/i.test(name)

  // A plain <a href> to a signed URL just navigates (opens in a tab) since the response has no
  // attachment disposition — fetch the bytes ourselves and hand the browser a blob it downloads.
  const download = async () => {
    if (!url || downloading) return
    setDownloading(true)
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = name || 'attachment'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(blobUrl)
    } finally { setDownloading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white">
        <div className="flex items-center justify-between border-b border-white/10 light:border-black/10 px-5 py-4">
          <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-white light:text-slate-900"><Paperclip size={15} className="shrink-0 text-slate-500" /><span className="truncate">{name || 'Attachment'}</span></div>
          <div className="flex items-center gap-1">
            {url && <button type="button" onClick={download} disabled={downloading} className="rounded-lg p-2 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900 disabled:opacity-50" title="Download"><Download size={16} /></button>}
            <button onClick={onClose} className="rounded-lg p-2 text-slate-400 light:text-slate-500 hover:bg-white/5"><X size={18} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-black/30 light:bg-black/[.08] p-4">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-500">Loading…</div>
          ) : !url ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-500">Couldn&apos;t load attachment.</div>
          ) : isImage ? (
            <img src={url} alt={name} className="mx-auto max-h-[70vh] rounded-xl object-contain" />
          ) : isPdf ? (
            <iframe src={url} title={name} className="h-[70vh] w-full rounded-xl bg-white" />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-sm text-slate-400 light:text-slate-500">
              <FileText size={28} />
              <button type="button" onClick={download} disabled={downloading} className="rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-4 py-2 text-sm font-semibold text-[#07101c] disabled:opacity-60">{downloading ? 'Downloading…' : 'Download file'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TransactionsView({ data, onOpenTxForm, onEditTx, onDeleteTx, onDeleteTxBulk, onImport, showMoney, onToggleMoney, onOpenRecurring, onPayCardBill }) {
  const { transactions, accounts, categories, credit_cards: creditCards = [] } = data
  const [query, setQuery] = useState('')
  // Mobile has no per-row delete icon (removed — see the row markup below); instead, a long press
  // enters selection mode, a plain tap after that toggles a row, and a bulk-delete action appears
  // in the toolbar. Desktop keeps its always-visible edit/delete icons unchanged.
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const longPressTimer = useRef(null)
  const longPressFired = useRef(false)
  const LONG_PRESS_MS = 500
  const cancelLongPress = () => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null } }
  const toggleSelect = (id) => setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  const startLongPress = (id) => {
    longPressFired.current = false
    cancelLongPress()
    longPressTimer.current = setTimeout(() => { longPressFired.current = true; setSelectMode(true); toggleSelect(id) }, LONG_PRESS_MS)
  }
  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()) }
  const handleRowTap = (t) => {
    if (longPressFired.current) { longPressFired.current = false; return } // suppress the tap the long-press itself just triggered
    if (selectMode) toggleSelect(t.id)
    else onEditTx(t)
  }
  const handleBulkDelete = async () => {
    const didDelete = await onDeleteTxBulk([...selectedIds])
    if (didDelete) exitSelectMode()
  }
  const [type, setType] = useState('all')
  const [accountId, setAccountId] = useState('all')
  const [categoryId, setCategoryId] = useState('all')
  const [chartView, setChartView] = useState(false)
  // Defaults to the current calendar month — the left/right arrows step one month at a time.
  // A custom range (below) overrides this entirely while active.
  const [monthCursor, setMonthCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } })
  const [customRange, setCustomRange] = useState(null)
  const [rangeOpen, setRangeOpen] = useState(false)
  const [rangeDraft, setRangeDraft] = useState({ start: '', end: '' })
  const [sortBy, setSortBy] = useState('date_desc')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [exportBusy, setExportBusy] = useState(false)
  const [page, setPage] = useState(0)
  const [viewingAttachment, setViewingAttachment] = useState(null)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const activeFilterCount = [type !== 'all', accountId !== 'all', categoryId !== 'all'].filter(Boolean).length
  const rangeRef = useRef(null)
  const settingsRef = useRef(null)
  // Mobile: swipe left/right on the list-vs-chart area to switch, carousel-style, in addition to
  // the explicit toggles (desktop icon pair, mobile Filters sheet switch). Threshold-based on
  // touchend rather than a drag-follow — simpler, and avoids fighting the list's vertical scroll.
  // swipeDirection also drives which way the crossfade slides, so it reads as one view sliding
  // out while the other slides in, not just a cut.
  const swipeStartRef = useRef(null)
  const [swipeDirection, setSwipeDirection] = useState(1)
  const SWIPE_THRESHOLD = 48
  const onSwipeTouchStart = (e) => { const t = e.touches[0]; swipeStartRef.current = { x: t.clientX, y: t.clientY } }
  const onSwipeTouchEnd = (e) => {
    const start = swipeStartRef.current
    swipeStartRef.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return
    if (dx < 0 && !chartView) { e.preventDefault(); setSwipeDirection(1); setChartView(true) }
    else if (dx > 0 && chartView) { e.preventDefault(); setSwipeDirection(-1); setChartView(false) }
  }
  useEffect(() => {
    const onDocClick = (e) => {
      if (rangeRef.current && !rangeRef.current.contains(e.target)) setRangeOpen(false)
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])
  useEffect(() => { setPage(0) }, [type, accountId, categoryId, customRange, monthCursor, query, sortBy])
  const shiftMonth = (delta) => {
    setCustomRange(null)
    setMonthCursor((c) => { const d = new Date(c.year, c.month + delta, 1); return { year: d.getFullYear(), month: d.getMonth() } })
  }
  const resolveSource = (t) => accounts.find((a) => a.id === t.account_id) || (t.linked_module === 'credit_card' ? creditCards.find((c) => c.id === t.linked_module_id) : null)

  const visible = useMemo(() => transactions.filter((t) => {
    if (type !== 'all' && t.type !== type) return false
    if (accountId !== 'all') {
      if (accountId.startsWith('cc:')) {
        if (!(t.linked_module === 'credit_card' && t.linked_module_id === accountId.slice(3))) return false
      } else if (t.account_id !== accountId) return false
    }
    if (categoryId !== 'all' && t.category_id !== categoryId) return false
    if (customRange) {
      if (t.date < customRange.start || t.date > customRange.end) return false
    } else {
      const d = new Date(`${t.date}T00:00:00`)
      if (d.getFullYear() !== monthCursor.year || d.getMonth() !== monthCursor.month) return false
    }
    const q = query.toLowerCase()
    if (!q) return true
    const acc = resolveSource(t)
    const cat = categories.find((c) => c.id === t.category_id)
    const searchable = `${t.description || ''} ${t.notes || ''} ${t.type || ''} ${acc?.name || ''} ${cat?.name || ''}`.toLowerCase()
    return searchable.includes(q)
  }), [transactions, type, accountId, categoryId, customRange, monthCursor, query, accounts, creditCards, categories])

  // amount is always stored positive (income vs. expense is the `type`, not the sign) — sorting
  // by the raw column would rank a ₹50,000 expense above a ₹10,000 income, which reads backwards
  // next to the +/- signs shown in the list. Sort by the same signed value the row displays.
  const signedAmount = (t) => {
    const isIn = t.type === 'income' || (t.type === 'transfer' && t.transfer_direction === 'in')
    return isIn ? Number(t.amount) : -Number(t.amount)
  }

  const sorted = useMemo(() => {
    const arr = [...visible]
    if (sortBy === 'date_asc') arr.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    else if (sortBy === 'amount_desc') arr.sort((a, b) => signedAmount(b) - signedAmount(a))
    else if (sortBy === 'amount_asc') arr.sort((a, b) => signedAmount(a) - signedAmount(b))
    else if (sortBy === 'description_asc') arr.sort((a, b) => (a.description || '').localeCompare(b.description || ''))
    else if (sortBy === 'description_desc') arr.sort((a, b) => (b.description || '').localeCompare(a.description || ''))
    else arr.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))
    return arr
  }, [visible, sortBy])

  // Tapping a sortable column header toggles asc/desc; switching to a different column starts
  // at whichever direction reads most naturally first (newest/highest/A-Z).
  const toggleSort = (field) => {
    setSortBy((prev) => {
      if (prev === `${field}_asc`) return `${field}_desc`
      if (prev === `${field}_desc`) return `${field}_asc`
      return field === 'description' ? `${field}_asc` : `${field}_desc`
    })
  }
  const sortIcon = (field) => {
    if (sortBy === `${field}_asc`) return <ChevronUp size={12} className="text-accent-300 light:text-accent-700" />
    if (sortBy === `${field}_desc`) return <ChevronDown size={12} className="text-accent-300 light:text-accent-700" />
    return <ArrowUpDown size={11} className="text-slate-600" />
  }

  const PAGE_SIZE = 50
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Category split of whatever's currently visible — respects every active filter above, so it's
  // always describing exactly the records on screen, not some separate fixed time window.
  const categoryBreakdown = useMemo(() => {
    const byCat = {}
    visible.filter((t) => t.type !== 'transfer').forEach((t) => {
      const cat = categories.find((c) => c.id === t.category_id)
      const key = cat?.id || 'uncat'
      if (!byCat[key]) byCat[key] = { name: cat?.name || 'Uncategorised', value: 0, color: cat?.color || '#64748b' }
      byCat[key].value += Number(t.amount || 0)
    })
    return Object.values(byCat).sort((a, b) => b.value - a.value)
  }, [visible, categories])

  // jsPDF's built-in fonts (Helvetica/Times/Courier) only support the WinAnsi charset, which
  // doesn't include ₹ — it silently falls back to a stray glyph instead of erroring. Since the
  // Amount column header already says what it is, the plain number reads fine without a symbol.
  const moneyForPdf = (value) => {
    const n = Number(value || 0)
    return `${n < 0 ? '-' : ''}${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n))}`
  }

  const exportCsv = () => {
    const csv = ['Date,Description,Type,Amount,Category,Account,Notes', ...sorted.map((r) => {
      const cat = categories.find((c) => c.id === r.category_id)?.name || ''
      const acc = resolveSource(r)?.name || ''
      return [r.date, JSON.stringify(r.description || ''), r.type, r.amount, JSON.stringify(cat), JSON.stringify(acc), JSON.stringify(r.notes || '')].join(',')
    })].join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.download = 'personal-finance-transactions.csv'
    link.click(); URL.revokeObjectURL(link.href)
  }

  const exportPdf = () => {
    const doc = new jsPDF()
    const rangeLabel = customRange ? `${formatDate(customRange.start)} - ${formatDate(customRange.end)}` : `${MONTH_NAMES[monthCursor.month]} ${monthCursor.year}`
    doc.setFontSize(14)
    doc.text('Personal Finance - Transaction Statement', 14, 16)
    doc.setFontSize(10)
    doc.text(rangeLabel, 14, 23)
    autoTable(doc, {
      startY: 28,
      head: [['Date', 'Description', 'Type', 'Category', 'Account', 'Amount']],
      body: sorted.map((r) => [formatDate(r.date), r.description || '', r.type, categories.find((c) => c.id === r.category_id)?.name || 'Uncategorised', resolveSource(r)?.name || '', moneyForPdf(r.amount)]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: { 5: { halign: 'right' } },
    })
    doc.save('personal-finance-transactions.pdf')
  }

  const handleExport = async (kind) => {
    setExportBusy(true)
    try { kind === 'pdf' ? exportPdf() : exportCsv() } finally { setExportBusy(false); setSettingsOpen(false) }
  }

  return (
    <div className="space-y-5">
      <CreditCardBillAlert creditCards={creditCards} transactions={transactions} onPay={onPayCardBill} showMoney={showMoney} />
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-accent-200/70 light:text-accent-700">Money movement</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white light:text-slate-900">Transactions</h1>
        </div>
        <div className="flex gap-2">
          <div className={`flex items-center rounded-xl border ${customRange ? 'border-white/5 light:border-black/5 opacity-40' : 'border-white/10 light:border-black/10'}`}>
            <button type="button" disabled={!!customRange} onClick={() => shiftMonth(-1)} className="rounded-l-xl p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900 disabled:pointer-events-none" title="Previous month"><ChevronLeft size={15} /></button>
            <span className="w-9 text-center text-xs font-semibold uppercase tracking-wider text-slate-300 light:text-slate-700" title={`${MONTH_NAMES[monthCursor.month]} ${monthCursor.year}`}>{MONTH_NAMES[monthCursor.month].slice(0, 3)}</span>
            <button type="button" disabled={!!customRange} onClick={() => shiftMonth(1)} className="rounded-r-xl p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900 disabled:pointer-events-none" title="Next month"><ChevronRight size={15} /></button>
          </div>
          <div ref={rangeRef} className="relative">
            <button type="button" onClick={() => { setRangeDraft(customRange || { start: '', end: '' }); setRangeOpen((o) => !o) }} className={`rounded-xl border p-2.5 transition ${customRange ? 'border-accent-300/40 bg-accent-400/10 text-accent-200 light:text-accent-700' : 'border-white/10 light:border-black/10 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900'}`} title="Custom date range">
              <Calendar size={16} />
            </button>
            {rangeOpen && (
              <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-4 shadow-2xl">
                <div className="mb-3 text-xs uppercase tracking-widest text-slate-500">Custom range</div>
                <label className="mb-3 block text-sm text-slate-300 light:text-slate-700">Start date
                  <DateInput value={rangeDraft.start} onChange={(e) => setRangeDraft((d) => ({ ...d, start: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-2.5 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
                </label>
                <label className="mb-4 block text-sm text-slate-300 light:text-slate-700">End date
                  <DateInput value={rangeDraft.end} onChange={(e) => setRangeDraft((d) => ({ ...d, end: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-2.5 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
                </label>
                <div className="flex gap-2">
                  {customRange && (
                    <button type="button" onClick={() => { setCustomRange(null); setRangeDraft({ start: '', end: '' }); setRangeOpen(false) }} className="flex-1 rounded-xl border border-white/10 light:border-black/10 px-3 py-2.5 text-sm text-slate-300 light:text-slate-700 hover:bg-white/5">Clear</button>
                  )}
                  <button type="button" disabled={!rangeDraft.start || !rangeDraft.end || rangeDraft.start > rangeDraft.end} onClick={() => { setCustomRange({ start: rangeDraft.start, end: rangeDraft.end }); setRangeOpen(false) }} className="flex-1 rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-3 py-2.5 text-sm font-semibold text-[#07101c] disabled:opacity-50">Apply</button>
                </div>
              </div>
            )}
          </div>
          {/* Already reachable on mobile as a "Chart view" switch inside the Filters sheet below —
              this icon-pair form is desktop-only to avoid showing the same control twice. */}
          <div className="hidden items-center overflow-hidden rounded-xl border border-white/10 light:border-black/10 lg:flex">
            <button type="button" onClick={() => { setSwipeDirection(-1); setChartView(false) }} title="Table view" className={`flex items-center px-3 py-2.5 transition ${!chartView ? 'bg-accent-400/15 text-accent-200 light:text-accent-700' : 'text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900'}`}><ListChecks size={16} /></button>
            <div className="h-5 w-px shrink-0 bg-white/10" />
            <button type="button" onClick={() => { setSwipeDirection(1); setChartView(true) }} title="Chart view" className={`flex items-center px-3 py-2.5 transition ${chartView ? 'bg-accent-400/15 text-accent-200 light:text-accent-700' : 'text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900'}`}><PieChartIcon size={16} /></button>
          </div>
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile: search plus one "Filters" trigger — the type/account/category selects and the
          import/export/recurring menu all move into a sheet instead of four controls competing
          for a 375px-wide row. Desktop keeps the full inline bar below unchanged. Long-pressing a
          row below swaps this for a selection toolbar instead. */}
      {selectMode ? (
        <div className="flex items-center gap-2 lg:hidden">
          <button type="button" onClick={exitSelectMode} className="shrink-0 rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900" title="Cancel selection"><X size={16} /></button>
          <div className="flex-1 text-sm font-medium text-white light:text-slate-900">{selectedIds.size} selected</div>
          <button type="button" disabled={selectedIds.size === 0} onClick={handleBulkDelete} className="shrink-0 rounded-xl border border-rose-300/30 bg-rose-300/10 p-2.5 text-rose-300 light:text-rose-700 hover:bg-rose-300/20 disabled:opacity-40 disabled:pointer-events-none" title="Delete selected"><Trash2 size={16} /></button>
        </div>
      ) : (
        <div className="flex gap-2 lg:hidden">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-3 text-slate-600" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search transactions" className="w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] py-2.5 pl-10 pr-4 text-sm text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
          </div>
          <button type="button" onClick={() => setMobileFiltersOpen(true)} className={`relative shrink-0 rounded-xl border p-2.5 transition ${activeFilterCount > 0 ? 'border-accent-300/40 bg-accent-400/10 text-accent-200 light:text-accent-700' : 'border-white/10 light:border-black/10 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900'}`} title="Filters">
            <ListChecks size={16} />
            {activeFilterCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-400 text-[9px] font-bold text-[#07101c]">{activeFilterCount}</span>}
          </button>
        </div>
      )}

      <div className="hidden gap-3 lg:flex">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-slate-600" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search transactions" className="w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] py-2.5 pl-10 pr-4 text-sm text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
        </div>
        <Select value={type} onChange={(e) => setType(e.target.value)} className="rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-4 py-2.5 text-sm text-slate-300 light:text-slate-700 outline-none">
          <option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option><option value="transfer">Transfer</option>
        </Select>
        <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-4 py-2.5 text-sm text-slate-300 light:text-slate-700 outline-none">
          <option value="all">All accounts</option>
          {accounts.filter((a) => a.type !== 'debit_card').map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          {creditCards.map((c) => <option key={c.id} value={`cc:${c.id}`}>{c.name} (card)</option>)}
        </Select>
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-4 py-2.5 text-sm text-slate-300 light:text-slate-700 outline-none">
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <div ref={settingsRef} className="relative">
          <button type="button" onClick={() => setSettingsOpen((o) => !o)} className={`rounded-xl border p-2.5 transition ${settingsOpen ? 'border-accent-300/40 bg-accent-400/10 text-accent-200 light:text-accent-700' : 'border-white/10 light:border-black/10 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900'}`} title="More options">
            <MoreVertical size={16} />
          </button>
          {settingsOpen && (
            <div className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-1 shadow-2xl">
              <button type="button" onClick={() => { setSettingsOpen(false); onImport() }} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5">Import CSV</button>
              <button type="button" disabled={exportBusy} onClick={() => handleExport('csv')} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5 disabled:opacity-50">Export as CSV</button>
              <button type="button" disabled={exportBusy} onClick={() => handleExport('pdf')} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5 disabled:opacity-50">Export as PDF</button>
              <div className="my-1 border-t border-white/10 light:border-black/10" />
              <button type="button" onClick={() => { setSettingsOpen(false); onOpenRecurring() }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5"><Repeat size={14} />Recurring transactions</button>
            </div>
          )}
        </div>
      </div>

      <BottomSheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen} title="Filters">
        <div className="space-y-4 pb-4">
          <label className="block text-sm text-slate-300 light:text-slate-700">Type
            <Select value={type} onChange={(e) => setType(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-4 py-2.5 text-sm text-slate-300 light:text-slate-700 outline-none">
              <option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option><option value="transfer">Transfer</option>
            </Select>
          </label>
          <label className="block text-sm text-slate-300 light:text-slate-700">Account
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-4 py-2.5 text-sm text-slate-300 light:text-slate-700 outline-none">
              <option value="all">All accounts</option>
              {accounts.filter((a) => a.type !== 'debit_card').map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              {creditCards.map((c) => <option key={c.id} value={`cc:${c.id}`}>{c.name} (card)</option>)}
            </Select>
          </label>
          <label className="block text-sm text-slate-300 light:text-slate-700">Category
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-4 py-2.5 text-sm text-slate-300 light:text-slate-700 outline-none">
              <option value="all">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </label>
          <div onClick={() => { setSwipeDirection(chartView ? -1 : 1); setChartView((v) => !v) }} className="flex w-full items-center justify-between rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-4 py-3 text-sm text-slate-300 light:text-slate-700">
            <span className="flex items-center gap-2"><PieChartIcon size={15} />Chart view</span>
            <ToggleSwitch checked={chartView} onChange={() => { setSwipeDirection(chartView ? -1 : 1); setChartView((v) => !v) }} />
          </div>
          <div className="border-t border-white/10 light:border-black/10 pt-2">
            <button type="button" onClick={() => { setMobileFiltersOpen(false); onImport() }} className="block w-full rounded-lg px-1 py-2.5 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5">Import CSV</button>
            <button type="button" disabled={exportBusy} onClick={() => handleExport('csv')} className="block w-full rounded-lg px-1 py-2.5 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5 disabled:opacity-50">Export as CSV</button>
            <button type="button" disabled={exportBusy} onClick={() => handleExport('pdf')} className="block w-full rounded-lg px-1 py-2.5 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5 disabled:opacity-50">Export as PDF</button>
            <button type="button" onClick={() => { setMobileFiltersOpen(false); onOpenRecurring() }} className="flex w-full items-center gap-2 rounded-lg px-1 py-2.5 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5"><Repeat size={14} />Recurring transactions</button>
          </div>
        </div>
      </BottomSheet>

      <div onTouchStart={onSwipeTouchStart} onTouchEnd={onSwipeTouchEnd} className="touch-pan-y overflow-hidden">
      <AnimatePresence mode="wait" initial={false} custom={swipeDirection}>
      <motion.div
        key={chartView ? 'chart' : 'list'}
        initial={{ opacity: 0, x: swipeDirection * 36 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: swipeDirection * -36 }}
        transition={{ duration: 0.26, ease: 'easeInOut' }}
      >
      {chartView ? (
        categoryBreakdown.length === 0 ? (
          <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card">
            <EmptyState icon={Tag} title="No category data" message="Nothing categorised in the current filters yet." />
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-4 sm:p-6">
            <div className="mb-5 text-sm font-semibold text-white light:text-slate-900">By category · {customRange ? `${formatDate(customRange.start)} – ${formatDate(customRange.end)}` : `${MONTH_NAMES[monthCursor.month]} ${monthCursor.year}`}</div>
            <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:gap-8">
              <div className="h-72 lg:h-[28rem]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryBreakdown} dataKey="value" nameKey="name" innerRadius="40%" outerRadius="76%" stroke="none">
                      {categoryBreakdown.map((c, i) => <Cell key={i} fill={c.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0f1420', border: '1px solid #ffffff22', borderRadius: 12, color: '#fff' }} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} formatter={(v) => (showMoney ? money(v) : '••••')} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col justify-center gap-3">
                {categoryBreakdown.map((c, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} />
                      <div className="truncate text-slate-300 light:text-slate-700">{c.name}</div>
                    </div>
                    <div className="shrink-0 font-medium text-white light:text-slate-900">{showMoney ? money(c.value) : '••••'}</div>
                  </div>
                ))}
                <div className="mt-1 border-t border-white/20 light:border-black/15" />
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="font-semibold text-white light:text-slate-900">Total</div>
                  <div className="font-semibold text-white light:text-slate-900">{showMoney ? money(categoryBreakdown.reduce((s, c) => s + c.value, 0)) : '••••'}</div>
                </div>
                <div className="border-t border-white/20 light:border-black/15" />
              </div>
            </div>
          </div>
        )
      ) : (
      <section className="overflow-hidden rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card">
        <div className="hidden grid-cols-[1.4fr_.9fr_.6fr_.6fr_auto] gap-4 border-b border-white/10 light:border-black/10 px-5 py-3 text-[10px] uppercase tracking-widest text-slate-600 sm:grid">
          <button type="button" onClick={() => toggleSort('description')} className="flex items-center gap-1 text-left hover:text-slate-300 hover:light:text-slate-700">Description{sortIcon('description')}</button>
          <span>Category / Account</span>
          <button type="button" onClick={() => toggleSort('date')} className="flex items-center gap-1 text-left hover:text-slate-300 hover:light:text-slate-700">Date{sortIcon('date')}</button>
          <button type="button" onClick={() => toggleSort('amount')} className="flex items-center justify-end gap-1 text-right hover:text-slate-300 hover:light:text-slate-700">Amount{sortIcon('amount')}</button>
          <span />
        </div>
        {sorted.length === 0 ? (
          <EmptyState icon={Wallet} title="No transactions match" message="Try adjusting filters, or add your first entry." cta="Add transaction" onCta={onOpenTxForm} />
        ) : (
          <div className="divide-y divide-white/5 light:divide-black/5">
            {pageRows.map((t) => {
              const cat = categories.find((c) => c.id === t.category_id)
              const acc = resolveSource(t)
              const isIn = t.type === 'income' || (t.type === 'transfer' && t.transfer_direction === 'in')
              const isTransfer = t.type === 'transfer'
              const sign = isIn ? '+' : '-'
              const color = isIn ? 'text-emerald-300 light:text-emerald-700' : isTransfer ? 'text-accent-300 light:text-accent-700' : 'text-rose-300 light:text-rose-700'
              return (
                <div key={t.id} className="px-5 py-3 sm:py-4">
                  {/* Mobile: icon-bubble + name/subtitle + trailing amount, one row — tap opens
                      edit. No per-row delete icon here; long-press enters selection mode (tap
                      toggles rows, the toolbar above handles bulk delete) instead. */}
                  <div className="flex items-center gap-3 sm:hidden">
                    {/* A div, not a button — the attachment paperclip below is a real nested
                        <button> right after the description, and a button can't legally contain
                        another button. role="button" + onKeyDown keeps it keyboard-accessible. */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleRowTap(t)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRowTap(t) } }}
                      onTouchStart={() => startLongPress(t.id)}
                      onTouchEnd={cancelLongPress}
                      onTouchMove={cancelLongPress}
                      onTouchCancel={cancelLongPress}
                      onContextMenu={(e) => e.preventDefault()}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      {selectMode ? (
                        selectedIds.has(t.id) ? (
                          <CheckCircle2 size={22} className="shrink-0 text-accent-400" />
                        ) : (
                          <div className="h-[22px] w-[22px] shrink-0 rounded-full border-2 border-white/20 light:border-black/20" />
                        )
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[.05] light:bg-black/[.035]" style={{ color: cat?.color || (isTransfer ? 'hsl(var(--accent-h) var(--accent-s) 69%)' : '#94a3b8') }}>
                          {isTransfer ? <ArrowLeftRight size={16} /> : isIn ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate text-sm font-medium text-white light:text-slate-900">
                          <span className="truncate">{capitalizeFirst(t.description)}</span>
                          {t.attachment_path && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); setViewingAttachment(t) }} className="shrink-0 pl-0.5 text-slate-500 hover:text-accent-300 hover:light:text-accent-700" title="View attachment"><Paperclip size={12} /></button>
                          )}
                          {t.recurring_source_id && <Repeat size={11} className="shrink-0 text-slate-500" />}
                        </div>
                        <div className="truncate text-[11px] text-slate-500">{cat?.name || (isTransfer ? 'Transfer' : 'Uncategorised')} · {formatDate(t.date)}</div>
                      </div>
                    </div>
                    <div className={`shrink-0 text-sm font-semibold ${color}`}>{showMoney ? `${sign}${money(t.amount).replace('-', '')}` : '••••'}</div>
                  </div>

                  {/* Desktop: unchanged full table row */}
                  <div className="hidden sm:grid sm:grid-cols-[1.4fr_.9fr_.6fr_.6fr_auto] sm:items-center sm:gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.05] light:bg-black/[.035]" style={{ color: cat?.color || (isTransfer ? 'hsl(var(--accent-h) var(--accent-s) 69%)' : '#94a3b8') }}>
                        {isTransfer ? <ArrowLeftRight size={16} /> : isIn ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-sm font-medium text-white light:text-slate-900">
                          {capitalizeFirst(t.description)}
                          {t.attachment_path && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); setViewingAttachment(t) }} className="shrink-0 text-slate-500 hover:text-accent-300 hover:light:text-accent-700" title="View attachment"><Paperclip size={12} /></button>
                          )}
                          {t.recurring_source_id && <Repeat size={12} className="shrink-0 text-slate-500" title="Auto-generated from a recurring rule" />}
                        </div>
                        {t.notes && <div className="text-[11px] text-slate-500">{capitalizeFirst(t.notes)}</div>}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 light:text-slate-500">
                      <span className="inline-block rounded-md bg-white/[.05] light:bg-black/[.035] px-2 py-0.5" style={{ color: cat?.color || '#94a3b8' }}>{cat?.name || (isTransfer ? (t.transfer_direction === 'in' ? 'Transfer in' : 'Transfer out') : 'Uncategorised')}</span>
                      {acc && <span className="ml-2">{acc.name}</span>}
                    </div>
                    <div className="text-xs text-slate-500">{formatDateTime(t.date, t.time)}</div>
                    <div className={`text-sm font-semibold sm:text-right ${color}`}>{showMoney ? `${sign}${money(t.amount).replace('-', '')}` : '••••'}</div>
                    <div className="flex gap-1 sm:justify-end">
                      <button onClick={() => onEditTx(t)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900"><Pencil size={14} /></button>
                      <button onClick={() => onDeleteTx(t)} className="rounded-lg p-1.5 text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 light:border-black/10 px-5 py-3 text-xs text-slate-400 light:text-slate-500">
            <span>Page {page + 1} of {totalPages} · {sorted.length} transactions</span>
            <div className="flex gap-2">
              <button type="button" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="rounded-lg border border-white/10 light:border-black/10 px-3 py-1.5 hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none">Previous</button>
              <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} className="rounded-lg border border-white/10 light:border-black/10 px-3 py-1.5 hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none">Next</button>
            </div>
          </div>
        )}
      </section>
      )}
      </motion.div>
      </AnimatePresence>
      </div>
      <AttachmentViewer open={!!viewingAttachment} onClose={() => setViewingAttachment(null)} transaction={viewingAttachment} />
    </div>
  )
}


/* ---------------- Shell (nav + main) ---------------- */
function Shell({ user, onLogout }) {
  const [view, setView] = useState('dashboard')
  const [showMoney, setShowMoney] = useState(true)
  // "Welcome back, X" shows on open, then crossfades to just "X" a couple seconds later — a
  // timer, not a nav-triggered flip, so the transition is actually visible on the dashboard
  // instead of happening invisibly while the header's unmounted on some other view. Stays "X"
  // for the rest of the session once it's fired; a real reload resets it.
  const [hasGreetedOnce, setHasGreetedOnce] = useState(false)
  useEffect(() => {
    if (hasGreetedOnce) return
    const t = setTimeout(() => setHasGreetedOnce(true), 2200)
    return () => clearTimeout(t)
  }, [hasGreetedOnce])
  // Which item (account/card/loan/...) the active view has drilled into, if any — reported up by
  // the view itself via onDetailChange so the mobile FAB knows whether to open a "list" add form
  // (e.g. Add loan) or a "detail" one (e.g. Log payment). Cleared on every view switch so a stale
  // id from the previous module can't leak into the new one before it reports its own state.
  const [activeDetailId, setActiveDetailId] = useState(null)
  useEffect(() => { setActiveDetailId(null) }, [view])
  const [data, setData] = useState({ accounts: [], categories: [], transactions: [], budgets: [], portfolios: [], holdings: [], sips: [], other_investments: [], kite_orders: [], loans: [], loan_payments: [], bucket_list: [], lend_borrow: [], lend_repayments: [], credit_cards: [], credit_card_transactions: [], scholarships: [], scholarship_payments: [], money_rules: [], recurring_transactions: [], money_profiles: [], money_profile_entries: [], budget_months: [], budget_month_categories: [], vault_items: [], profile: null })
  const [loading, setLoading] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const mutate = useMemo(() => createMutate(setData, setPendingCount), [])

  const toast = useToast()
  const confirm = useConfirm()
  const prompt = usePrompt()

  const [txFormOpen, setTxFormOpen] = useState(false)
  const [txEditing, setTxEditing] = useState(null)
  const [txDefaultAccountId, setTxDefaultAccountId] = useState('')
  const [txDefaultRepayment, setTxDefaultRepayment] = useState(null)
  const [accFormOpen, setAccFormOpen] = useState(false)
  const [accEditing, setAccEditing] = useState(null)
  const [catFormOpen, setCatFormOpen] = useState(false)
  const [catEditing, setCatEditing] = useState(null)
  const [catFormDefaultType, setCatFormDefaultType] = useState(null)
  const [budgetFormOpen, setBudgetFormOpen] = useState(false)
  const [budgetEditing, setBudgetEditing] = useState(null)
  const [budgetMonthFormOpen, setBudgetMonthFormOpen] = useState(false)
  const [budgetMonthFormInitial, setBudgetMonthFormInitial] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } })
  const [csvOpen, setCsvOpen] = useState(false)
  const [portfolioFormOpen, setPortfolioFormOpen] = useState(false)
  const [portfolioEditing, setPortfolioEditing] = useState(null)
  const [holdingFormOpen, setHoldingFormOpen] = useState(false)
  const [holdingEditing, setHoldingEditing] = useState(null)
  const [holdingDefaultPortfolio, setHoldingDefaultPortfolio] = useState('')
  const [otherInvestmentFormOpen, setOtherInvestmentFormOpen] = useState(false)
  const [otherInvestmentEditing, setOtherInvestmentEditing] = useState(null)
  const [otherInvestmentPortfolioId, setOtherInvestmentPortfolioId] = useState('')
  const [bulkImportOpen, setBulkImportOpen] = useState(false)
  const [bulkImportPortfolio, setBulkImportPortfolio] = useState(null)
  const [loanFormOpen, setLoanFormOpen] = useState(false)
  const [loanEditing, setLoanEditing] = useState(null)
  const [loanPayOpen, setLoanPayOpen] = useState(false)
  const [loanPayLoan, setLoanPayLoan] = useState(null)
  const [bucketFormOpen, setBucketFormOpen] = useState(false)
  const [bucketEditing, setBucketEditing] = useState(null)
  const [lendFormOpen, setLendFormOpen] = useState(false)
  const [lendEditing, setLendEditing] = useState(null)
  const [manageLendAccessOpen, setManageLendAccessOpen] = useState(false)
  const [manageLendAccessRecord, setManageLendAccessRecord] = useState(null)
  const [fundsFormOpen, setFundsFormOpen] = useState(false)
  const [fundsPortfolio, setFundsPortfolio] = useState(null)
  const [withdrawFormOpen, setWithdrawFormOpen] = useState(false)
  const [withdrawPortfolio, setWithdrawPortfolio] = useState(null)
  const [sipFormOpen, setSipFormOpen] = useState(false)
  const [sipEditing, setSipEditing] = useState(null)
  // `theme` here is next-themes' real state (drives the `dark`/`light` class on <html>, see
  // components/ThemeProvider.jsx) — kept in sync with the persisted profile.theme below rather
  // than owning its own separate source of truth.
  const { theme, setTheme } = useTheme()
  const [cardFormOpen, setCardFormOpen] = useState(false)
  const [cardEditing, setCardEditing] = useState(null)
  const [cardSpendOpen, setCardSpendOpen] = useState(false)
  const [cardSpendTarget, setCardSpendTarget] = useState(null)
  const [cardPayOpen, setCardPayOpen] = useState(false)
  const [cardPayTarget, setCardPayTarget] = useState(null)
  const [vaultFormOpen, setVaultFormOpen] = useState(false)
  const [vaultEditing, setVaultEditing] = useState(null)
  const [vaultDefaultType, setVaultDefaultType] = useState('bank_account')
  const [scholarshipFormOpen, setScholarshipFormOpen] = useState(false)
  const [scholarshipEditing, setScholarshipEditing] = useState(null)
  const [scholarshipPayOpen, setScholarshipPayOpen] = useState(false)
  const [scholarshipPayTarget, setScholarshipPayTarget] = useState(null)
  const [pricesLoading, setPricesLoading] = useState(false)
  const [kiteSyncBusy, setKiteSyncBusy] = useState(false)
  const [recurringManagerOpen, setRecurringManagerOpen] = useState(false)
  const [recurringFormOpen, setRecurringFormOpen] = useState(false)
  const [recurringEditing, setRecurringEditing] = useState(null)
  const [moneyProfileFormOpen, setMoneyProfileFormOpen] = useState(false)
  const [moneyProfileEditing, setMoneyProfileEditing] = useState(null)
  const [moneyProfileEntryFormOpen, setMoneyProfileEntryFormOpen] = useState(false)
  const [moneyProfileEntryEditing, setMoneyProfileEntryEditing] = useState(null)
  const [moneyProfileEntryProfileId, setMoneyProfileEntryProfileId] = useState(null)
  const [moneyProfileBulkImportOpen, setMoneyProfileBulkImportOpen] = useState(false)
  const [moneyProfileBulkImportProfile, setMoneyProfileBulkImportProfile] = useState(null)
  const [manageAccessOpen, setManageAccessOpen] = useState(false)
  const [manageAccessProfile, setManageAccessProfile] = useState(null)
  const [settingsSection, setSettingsSection] = useState('profile')
  const [moreOpen, setMoreOpen] = useState(false)
  // Forces the spotlight tour back open even though tour_completed_at is already set — flipped on
  // by "Replay tour" in Settings > User guide, flipped back off once the tour closes so it doesn't loop.
  const [forceTour, setForceTour] = useState(false)

  const refresh = async ({ silent = false } = {}) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      // Serwist's runtime cache may still have a stale /finance/summary response it could serve
      // here — but trusting that would silently overwrite whatever's already correctly in `data`
      // (freshly loaded from Dexie, or just optimistically updated by a queued offline mutation)
      // with older data. Skip the round trip entirely rather than risk that. No error toast here
      // either — every caller either already has its own accurate feedback (a mutation's own
      // "will sync when back online" toast) or is the silent mount-time reconcile; offline is a
      // normal, well-handled state now, not a failure worth alarming over.
      setLoading(false)
      return
    }
    try {
      // Same hung-request guard as the auth check above — a request that never settles would
      // otherwise leave `loading` true forever, since `finally` only runs once it does.
      const response = await fetch('/api/finance/summary', { signal: AbortSignal.timeout(20000) })
      if (!response.ok) throw new Error('Failed to load')
      const result = await response.json()
      const snapshot = {
        accounts: result.accounts || [], categories: result.categories || [], transactions: result.transactions || [], budgets: result.budgets || [],
        portfolios: result.portfolios || [], holdings: result.holdings || [], sips: result.sips || [], other_investments: result.other_investments || [], kite_orders: result.kite_orders || [],
        loans: result.loans || [], loan_payments: result.loan_payments || [], bucket_list: result.bucket_list || [],
        lend_borrow: result.lend_borrow || [], lend_repayments: result.lend_repayments || [],
        credit_cards: result.credit_cards || [], credit_card_transactions: result.credit_card_transactions || [],
        scholarships: result.scholarships || [], scholarship_payments: result.scholarship_payments || [],
        money_rules: result.money_rules || [],
        recurring_transactions: result.recurring_transactions || [],
        money_profiles: result.money_profiles || [], money_profile_entries: result.money_profile_entries || [],
        budget_months: result.budget_months || [], budget_month_categories: result.budget_month_categories || [],
        vault_items: result.vault_items || [],
        profile: result.profile || null,
      }
      setData(snapshot)
      // Best-effort — a Dexie failure (private browsing, storage quota) should never break the
      // live app, same tolerance as the server-side opportunistic syncs this endpoint runs.
      saveSnapshot(snapshot).catch(() => {})
    } catch (e) {
      // silent: true means a cached snapshot is already on screen (see the mount effect below) —
      // this failure just means the background reconcile couldn't reach the server, which is an
      // expected, already-handled offline state, not a fresh error worth interrupting over.
      if (!silent) toast.push(e.message || 'Could not load data', 'error')
    } finally { setLoading(false) }
  }
  // Same StrictMode double-invoke guard as App's initial auth check above — without it this
  // fires the full 19-table /finance/summary load twice on every page open.
  const didLoad = useRef(false)
  useEffect(() => {
    if (didLoad.current) return
    didLoad.current = true
    ;(async () => {
      const cached = await loadSnapshot().catch(() => null)
      if (cached) { setData(cached); setLoading(false) }
      refresh({ silent: !!cached })
    })()
  }, [])

  // Whatever's still queued from a previous session (a tab closed mid-flush, an offline write
  // that never got the chance to sync) resumes trying here, plus a listener for reconnect/tab-
  // focus/service-worker-nudged retries going forward.
  useEffect(() => {
    getPendingCount().then(setPendingCount).catch(() => {})
    if (navigator.onLine) flushOutbox(setData, setPendingCount).catch(() => {})
    const onSyncIssue = (e) => toast.push(`Couldn't sync a change to ${e.detail?.table || 'something'} — it may need to be redone`, 'error')
    window.addEventListener('outbox:sync-issue', onSyncIssue)
    const cleanup = registerAutoFlush(setData, setPendingCount)
    return () => { window.removeEventListener('outbox:sync-issue', onSyncIssue); cleanup() }
  }, [])

  const openTxForm = (t = null, defaultAccountId = '', defaultRepayment = null) => { setTxEditing(t); setTxDefaultAccountId(defaultAccountId); setTxDefaultRepayment(defaultRepayment); setTxFormOpen(true) }
  const closeTxForm = () => { setTxFormOpen(false); setTxEditing(null); setTxDefaultAccountId(''); setTxDefaultRepayment(null) }
  const onTxSaved = async () => { closeTxForm(); await refresh() }

  const openAccForm = (a = null) => { setAccEditing(a); setAccFormOpen(true) }
  const closeAccForm = () => { setAccFormOpen(false); setAccEditing(null) }
  const onAccSaved = async () => { closeAccForm(); await refresh() }

  const openCatForm = (c = null, defaultType = null) => { setCatEditing(c); setCatFormDefaultType(defaultType); setCatFormOpen(true) }
  const closeCatForm = () => { setCatFormOpen(false); setCatEditing(null); setCatFormDefaultType(null) }
  const onCatSaved = async () => { closeCatForm(); await refresh() }

  const openBudgetForm = (b = null) => { setBudgetEditing(b); setBudgetFormOpen(true) }
  const closeBudgetForm = () => { setBudgetFormOpen(false); setBudgetEditing(null) }
  const onBudgetSaved = async () => { closeBudgetForm(); await refresh() }

  const deleteBudget = async (b) => {
    if (!(await confirm.ask('Delete this budget?'))) return
    const { queued } = await mutate({ table: 'budgets', method: 'DELETE', id: b.id })
    toast.push(queued ? 'Budget deleted — will sync when back online' : 'Budget deleted')
  }

  // Monthly budget plans — a plan + its category lines are opened/edited together.
  // year/month is only the STARTING point — the form owns its own month cursor from there
  // (prev/next), so this can be current month, next month ("plan ahead"), or any past month
  // ("back-fill") depending on where it was opened from.
  const openBudgetMonthForm = (year, month) => { setBudgetMonthFormInitial({ year, month }); setBudgetMonthFormOpen(true) }
  const closeBudgetMonthForm = () => setBudgetMonthFormOpen(false)
  const onBudgetMonthSaved = async () => { closeBudgetMonthForm(); await refresh() }
  // close/reopen are deliberately kept as dedicated endpoints (not a generic PATCH) so they
  // can't race a concurrent /budget_months/save — stays a direct online-only call, not mutate().
  const closeBudgetMonth = async (plan) => {
    if (!(await confirm.ask(`Close ${MONTH_NAMES[plan.month]} ${plan.year}'s budget? It moves into your history log — you can still reopen it later.`))) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.push('Closing a budget month needs a connection — try again once you’re back online.', 'error')
      return
    }
    const response = await fetch(`/api/finance/budget_months/${plan.id}/close`, { method: 'POST' })
    if (response.ok) { toast.push('Month closed'); await refresh() } else { toast.push('Could not close', 'error') }
  }
  const reopenBudgetMonth = async (plan) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.push('Reopening a budget month needs a connection — try again once you’re back online.', 'error')
      return
    }
    const response = await fetch(`/api/finance/budget_months/${plan.id}/reopen`, { method: 'POST' })
    if (response.ok) { toast.push('Month reopened'); await refresh() } else { toast.push('Could not reopen', 'error') }
  }
  const deleteBudgetMonth = async (plan) => {
    if (!(await confirm.ask(`Delete ${MONTH_NAMES[plan.month]} ${plan.year}'s budget? This can't be undone.`))) return
    const { queued } = await mutate({ table: 'budget_months', method: 'DELETE', id: plan.id })
    toast.push(queued ? 'Budget deleted — will sync when back online' : 'Budget deleted')
  }

  const openRecurringManager = () => setRecurringManagerOpen(true)
  const closeRecurringManager = () => setRecurringManagerOpen(false)
  const openRecurringForm = (r = null) => { setRecurringEditing(r); setRecurringFormOpen(true) }
  const closeRecurringForm = () => { setRecurringFormOpen(false); setRecurringEditing(null) }
  const onRecurringSaved = async () => { closeRecurringForm(); await refresh() }
  const toggleRecurring = async (r) => {
    const response = await fetch(`/api/finance/recurring_transactions/${r.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !r.is_active }) })
    if (response.ok) await refresh(); else toast.push('Update failed', 'error')
  }
  const deleteRecurring = async (r) => {
    if (!(await confirm.ask(`Stop "${r.description}"? Past transactions it already created stay put.`, { confirmLabel: 'Stop' }))) return
    const response = await fetch(`/api/finance/recurring_transactions/${r.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Recurring rule removed'); await refresh() } else { toast.push('Delete failed', 'error') }
  }

  // Investments
  const openPortfolioForm = (p = null) => { setPortfolioEditing(p); setPortfolioFormOpen(true) }
  const closePortfolioForm = () => { setPortfolioFormOpen(false); setPortfolioEditing(null) }
  const onPortfolioSaved = async () => { closePortfolioForm(); await refresh() }
  const openHoldingForm = (portfolioId = '') => { setHoldingEditing(null); setHoldingDefaultPortfolio(portfolioId); setHoldingFormOpen(true) }
  const openHoldingEdit = (h) => { setHoldingEditing(h); setHoldingFormOpen(true) }
  const closeHoldingForm = () => { setHoldingFormOpen(false); setHoldingEditing(null) }
  const onHoldingSaved = async () => { closeHoldingForm(); await refresh() }
  const openBulkImport = (p) => { setBulkImportPortfolio(p); setBulkImportOpen(true) }
  const closeBulkImport = () => { setBulkImportOpen(false); setBulkImportPortfolio(null) }
  const onBulkImported = async () => { closeBulkImport(); await refresh() }
  const deletePortfolio = async (p) => {
    if (!(await confirm.ask(`Delete portfolio "${p.name}"? Its holdings and other investments will be removed too — SIPs will just be unlinked, not deleted.`))) return
    const { queued } = await mutate({ table: 'portfolios', method: 'DELETE', id: p.id })
    // The cascade (removing holdings/other investments, unlinking SIPs) happens server-side —
    // while queued offline those child rows stay visible locally until the next real sync, same
    // "stale until reconnect" tradeoff already accepted for derived balances.
    toast.push(queued ? 'Portfolio deleted — will sync when back online' : 'Portfolio deleted')
  }
  const deleteHolding = async (h) => {
    if (!(await confirm.ask(`Remove ${h.symbol}?`))) return
    const { queued } = await mutate({ table: 'holdings', method: 'DELETE', id: h.id })
    toast.push(queued ? 'Holding removed — will sync when back online' : 'Holding removed')
  }
  const openOtherInvestmentForm = (portfolioId) => { setOtherInvestmentEditing(null); setOtherInvestmentPortfolioId(portfolioId); setOtherInvestmentFormOpen(true) }
  const openOtherInvestmentEdit = (o) => { setOtherInvestmentEditing(o); setOtherInvestmentPortfolioId(o.portfolio_id); setOtherInvestmentFormOpen(true) }
  const closeOtherInvestmentForm = () => { setOtherInvestmentFormOpen(false); setOtherInvestmentEditing(null) }
  const onOtherInvestmentSaved = async () => { closeOtherInvestmentForm(); await refresh() }
  const deleteOtherInvestment = async (o) => {
    if (!(await confirm.ask(`Remove "${o.name}"?`))) return
    const { queued } = await mutate({ table: 'other_investments', method: 'DELETE', id: o.id })
    toast.push(queued ? 'Investment removed — will sync when back online' : 'Investment removed')
  }
  // Manual override — the price you type in directly, distinct from a live fetch below.
  const onManualPriceEntry = async (h) => {
    const price = await prompt.ask(`Update current price for ${h.symbol}`, { defaultValue: h.current_price || h.avg_buy_price, inputType: 'number', confirmLabel: 'Update' })
    if (!price || !Number.isFinite(Number(price))) return
    const { queued } = await mutate({ table: 'holdings', method: 'PATCH', id: h.id, body: { current_price: Number(price), last_price_updated_at: new Date().toISOString() } })
    toast.push(queued ? `${h.symbol} updated — will sync when back online` : `${h.symbol} updated`)
  }
  // Live fetch, scoped to just this one holding — reuses the same endpoint the toolbar's
  // "Refresh prices" button calls for everything, just with a single-symbol array.
  const onRefreshRowPrice = async (h) => {
    try {
      const response = await fetch('/api/finance/prices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ symbols: [{ symbol: h.symbol, exchange: h.exchange }] }) })
      const result = await response.json()
      if (result.prices?.[h.symbol]) { toast.push(`${h.symbol} refreshed via ${result.kite_active ? 'Kite live' : 'Yahoo'}`); await refresh() } else { toast.push(`No live price found for ${h.symbol}`, 'error') }
    } catch (e) { toast.push('Price fetch failed', 'error') }
  }

  // Loans
  const openLoanForm = (l = null) => { setLoanEditing(l); setLoanFormOpen(true) }
  const closeLoanForm = () => { setLoanFormOpen(false); setLoanEditing(null) }
  const onLoanSaved = async () => { closeLoanForm(); await refresh() }
  const openLoanPay = (loan) => { setLoanPayLoan(loan); setLoanPayOpen(true) }
  const closeLoanPay = () => { setLoanPayOpen(false); setLoanPayLoan(null) }
  const onLoanPaid = async () => { closeLoanPay(); await refresh() }
  const deleteLoan = async (l) => {
    if (!(await confirm.ask(`Delete loan "${l.name}"? All payment records will be removed.`))) return
    const { queued } = await mutate({ table: 'loans', method: 'DELETE', id: l.id })
    toast.push(queued ? 'Loan deleted — will sync when back online' : 'Loan deleted')
  }
  const deleteLoanPayment = async (p) => {
    if (!(await confirm.ask('Reverse this payment? The linked transaction and outstanding will restore.'))) return
    const response = await fetch(`/api/finance/loan_payments/${p.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Payment reversed'); await refresh() } else { toast.push('Delete failed', 'error') }
  }
  const syncLoanOutstanding = async (loan, targetOutstanding) => {
    const response = await fetch('/api/finance/loan_payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loan_id: loan.id, type: 'adjustment', target_outstanding: targetOutstanding }) })
    const data = await response.json()
    if (response.ok) { toast.push('Outstanding synced'); await refresh() } else { toast.push(data.error || 'Sync failed', 'error') }
  }

  // Bucket list
  const openBucketForm = (b = null) => { setBucketEditing(b); setBucketFormOpen(true) }
  const closeBucketForm = () => { setBucketFormOpen(false); setBucketEditing(null) }
  const onBucketSaved = async () => { closeBucketForm(); await refresh() }
  const deleteBucket = async (b) => {
    if (!(await confirm.ask(`Remove "${b.title}" from bucket list?`))) return
    const { queued } = await mutate({ table: 'bucket_list', method: 'DELETE', id: b.id })
    toast.push(queued ? 'Removed — will sync when back online' : 'Removed')
  }

  // Lend/Borrow
  const openLendForm = (l = null) => { setLendEditing(l); setLendFormOpen(true) }
  const closeLendForm = () => { setLendFormOpen(false); setLendEditing(null) }
  const onLendSaved = async () => { closeLendForm(); await refresh() }
  const deleteLend = async (l) => {
    if (!(await confirm.ask(`Delete record for ${l.person_name}? Linked transaction (if any) will be removed too.`))) return
    const response = await fetch(`/api/finance/lend_borrow/${l.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Deleted'); await refresh() } else { toast.push('Delete failed', 'error') }
  }
  const openManageLendAccess = (record) => { setManageLendAccessRecord(record); setManageLendAccessOpen(true) }
  const closeManageLendAccess = () => { setManageLendAccessOpen(false); setManageLendAccessRecord(null) }

  // Portfolio funds
  const openFundsForm = (p) => { setFundsPortfolio(p); setFundsFormOpen(true) }
  const closeFundsForm = () => { setFundsFormOpen(false); setFundsPortfolio(null) }
  const onFundsSaved = async () => { closeFundsForm(); await refresh() }
  const openWithdrawForm = (p) => { setWithdrawPortfolio(p); setWithdrawFormOpen(true) }
  const closeWithdrawForm = () => { setWithdrawFormOpen(false); setWithdrawPortfolio(null) }
  const onWithdrawSaved = async () => { closeWithdrawForm(); await refresh() }

  // SIPs
  const openSipForm = (s = null) => { setSipEditing(s); setSipFormOpen(true) }
  const closeSipForm = () => { setSipFormOpen(false); setSipEditing(null) }
  const onSipSaved = async () => { closeSipForm(); await refresh() }
  const deleteSip = async (s) => {
    if (!(await confirm.ask(`Delete SIP "${s.fund_name}"?`))) return
    const { queued } = await mutate({ table: 'sips', method: 'DELETE', id: s.id })
    toast.push(queued ? 'SIP deleted — will sync when back online' : 'SIP deleted')
  }

  // Profile — the PATCH response already returns the full updated row, so this updates just
  // that slice of `data` directly instead of paying for a full refresh() (a 19-table re-fetch)
  // to reflect what's typically a single changed field, like the guardrails toggle.
  const onSaveProfile = async (payload) => {
    const response = await fetch('/api/finance/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (response.ok) {
      const updated = await response.json()
      setData((d) => ({ ...d, profile: updated }))
      toast.push('Profile saved')
    } else {
      toast.push('Could not save', 'error')
    }
  }
  // Each user's own Kite Connect app (Settings > Kite Connect) — /kite/credentials only returns
  // the non-secret key back, so the profile slice is patched directly rather than replaced
  // wholesale the way onSaveProfile does with its full-row PATCH response.
  const saveKiteCredentials = async (payload) => {
    const response = await fetch('/api/kite/credentials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (response.ok) {
      const { kite_api_key } = await response.json()
      setData((d) => ({ ...d, profile: { ...d.profile, kite_api_key } }))
      toast.push('Kite app saved')
    } else {
      const err = await response.json().catch(() => ({}))
      toast.push(err.error || 'Could not save Kite app', 'error')
    }
  }
  const removeKiteCredentials = async () => {
    const response = await fetch('/api/kite/credentials', { method: 'DELETE' })
    if (response.ok) {
      setData((d) => ({ ...d, profile: { ...d.profile, kite_api_key: null, kite_connected: false, kite_broken: false } }))
      toast.push('Kite app disconnected')
    } else {
      toast.push('Could not disconnect', 'error')
    }
  }
  useEffect(() => { if (data.profile?.theme) setTheme(data.profile.theme) }, [data.profile])
  useEffect(() => { if (data.profile?.accent_color) applyAccentColor(data.profile.accent_color) }, [data.profile?.accent_color])
  // Every non-mandatory module is opt-in — if the one behind the current view gets turned off
  // (or data just loaded with it already off), fall back to the dashboard instead of showing a
  // nav-less dead view.
  useEffect(() => {
    const moduleKey = VIEW_TO_MODULE[view]
    if (moduleKey && data.profile && !resolveModuleSettings(data.profile)[moduleKey]?.enabled) setView('dashboard')
  }, [view, data.profile])
  const onThemeChange = async (t) => {
    setTheme(t)
    // Also update data.profile.theme locally (not just next-themes' own state) — the effect above
    // re-syncs setTheme(data.profile.theme) whenever data.profile changes reference (e.g. on an
    // unrelated accent-color update), and without this it would re-apply the stale pre-toggle value.
    setData((d) => ({ ...d, profile: { ...d.profile, theme: t } }))
    await fetch('/api/finance/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: t }) })
    toast.push(`Switched to ${t} theme`, 'info')
  }
  const onAccentChange = async (hex) => {
    applyAccentColor(hex)
    setData((d) => ({ ...d, profile: { ...d.profile, accent_color: hex } }))
    const response = await fetch('/api/finance/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accent_color: hex }) })
    if (!response.ok) { toast.push('Could not save accent color', 'error'); return }
    toast.push('Accent color updated', 'info')
  }

  // Credit cards
  const openCardForm = (c = null) => { setCardEditing(c); setCardFormOpen(true) }
  const closeCardForm = () => { setCardFormOpen(false); setCardEditing(null) }
  const onCardSaved = async () => { closeCardForm(); await refresh() }
  const deleteCard = async (c) => {
    if (!(await confirm.ask(`Delete card "${c.name}"? All linked spends will be removed.`))) return
    const { queued } = await mutate({ table: 'credit_cards', method: 'DELETE', id: c.id })
    toast.push(queued ? 'Card deleted — will sync when back online' : 'Card deleted')
  }
  const openCardSpend = (c) => { setCardSpendTarget(c); setCardSpendOpen(true) }
  const closeCardSpend = () => { setCardSpendOpen(false); setCardSpendTarget(null) }
  const onCardSpendSaved = async () => { closeCardSpend(); await refresh() }
  const openCardPay = (c) => { setCardPayTarget(c); setCardPayOpen(true) }
  const closeCardPay = () => { setCardPayOpen(false); setCardPayTarget(null) }
  const onCardPaid = async () => { closeCardPay(); await refresh() }
  const deleteCardSpend = async (t) => {
    if (!(await confirm.ask('Delete this spend?'))) return
    const response = await fetch(`/api/finance/credit_card_transactions/${t.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Spend removed'); await refresh() } else { toast.push('Delete failed', 'error') }
  }
  const openVaultForm = (item = null, defaultType = 'bank_account') => { setVaultEditing(item); setVaultDefaultType(defaultType); setVaultFormOpen(true) }
  const closeVaultForm = () => { setVaultFormOpen(false); setVaultEditing(null) }
  const onVaultSaved = async () => { closeVaultForm(); await refresh() }
  const deleteVaultItem = async (item) => {
    if (!(await confirm.ask(`Delete "${item.label}" from the vault? This can't be undone.`))) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.push('Deleting a vault item needs a connection — try again once you’re back online.', 'error')
      return
    }
    const response = await fetch(`/api/finance/vault_items/${item.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Vault item deleted'); await refresh() } else { toast.push('Delete failed', 'error') }
  }

  // Scholarships
  const openScholarshipForm = (s = null) => { setScholarshipEditing(s); setScholarshipFormOpen(true) }
  const closeScholarshipForm = () => { setScholarshipFormOpen(false); setScholarshipEditing(null) }
  const onScholarshipSaved = async () => { closeScholarshipForm(); await refresh() }
  const deleteScholarship = async (s) => {
    if (!(await confirm.ask(`Delete "${s.name}"? Linked payments will be removed.`))) return
    const response = await fetch(`/api/finance/scholarships/${s.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Deleted'); await refresh() } else { toast.push('Delete failed', 'error') }
  }
  const openScholarshipPay = (s) => { setScholarshipPayTarget(s); setScholarshipPayOpen(true) }
  const closeScholarshipPay = () => { setScholarshipPayOpen(false); setScholarshipPayTarget(null) }
  const onScholarshipPaid = async () => { closeScholarshipPay(); await refresh() }

  // Live prices refresh
  const refreshAllPrices = async () => {
    if (data.holdings.length === 0) return
    setPricesLoading(true)
    try {
      const symbols = data.holdings.map((h) => ({ symbol: h.symbol, exchange: h.exchange }))
      const response = await fetch('/api/finance/prices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ symbols }) })
      const result = await response.json()
      const updated = Object.keys(result.prices || {}).length
      toast.push(`Refreshed ${updated} price${updated === 1 ? '' : 's'}${result.kite_active ? ' via Kite live' : ' via Yahoo'}`, updated ? 'success' : 'info')
      await refresh()
    } catch (e) { toast.push('Price fetch failed', 'error') } finally { setPricesLoading(false) }
  }

  // Family / Company
  const openMoneyProfileForm = (p = null) => { setMoneyProfileEditing(p); setMoneyProfileFormOpen(true) }
  const closeMoneyProfileForm = () => { setMoneyProfileFormOpen(false); setMoneyProfileEditing(null) }
  const onMoneyProfileSaved = async () => { closeMoneyProfileForm(); await refresh() }
  const deleteMoneyProfile = async (p) => {
    if (!(await confirm.ask(`Delete profile "${p.name}"? Its entries will be removed too. Any transactions already mirrored into your accounts (for a linked profile) are left as-is — they really happened.`))) return
    const { queued } = await mutate({ table: 'money_profiles', method: 'DELETE', id: p.id })
    toast.push(queued ? 'Profile deleted — will sync when back online' : 'Profile deleted')
  }
  const openMoneyProfileEntryForm = (profileId) => { setMoneyProfileEntryEditing(null); setMoneyProfileEntryProfileId(profileId); setMoneyProfileEntryFormOpen(true) }
  const openMoneyProfileEntryEdit = (e) => { setMoneyProfileEntryEditing(e); setMoneyProfileEntryProfileId(e.profile_id); setMoneyProfileEntryFormOpen(true) }
  const closeMoneyProfileEntryForm = () => { setMoneyProfileEntryFormOpen(false); setMoneyProfileEntryEditing(null) }
  const onMoneyProfileEntrySaved = async () => { closeMoneyProfileEntryForm(); await refresh() }
  const deleteMoneyProfileEntry = async (e) => {
    if (!(await confirm.ask(`Delete this entry? ${e.description}`))) return
    const response = await fetch(`/api/finance/money_profile_entries/${e.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Entry deleted'); await refresh() } else { toast.push('Delete failed', 'error') }
  }
  const openMoneyProfileBulkImport = (p) => { setMoneyProfileBulkImportProfile(p); setMoneyProfileBulkImportOpen(true) }
  const closeMoneyProfileBulkImport = () => { setMoneyProfileBulkImportOpen(false); setMoneyProfileBulkImportProfile(null) }
  const onMoneyProfileBulkImported = async () => { closeMoneyProfileBulkImport(); await refresh() }
  const toggleMoneyProfileStatus = async (p) => {
    const nextStatus = p.status === 'closed' ? 'active' : 'closed'
    const { queued } = await mutate({ table: 'money_profiles', method: 'PATCH', id: p.id, body: { status: nextStatus } })
    toast.push((nextStatus === 'closed' ? 'Profile closed' : 'Profile reactivated') + (queued ? ' — will sync when back online' : ''))
  }
  const openManageAccess = (p) => { setManageAccessProfile(p); setManageAccessOpen(true) }
  const closeManageAccess = () => { setManageAccessOpen(false); setManageAccessProfile(null) }
  // Money rules
  const addRule = async (rule_text) => {
    const nextOrder = (data.money_rules?.[data.money_rules.length - 1]?.order_index ?? 0) + 1
    const response = await fetch('/api/finance/money_rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rule_text, order_index: nextOrder, is_active: true }) })
    if (response.ok) { toast.push('Rule added'); await refresh() } else { toast.push('Could not add', 'error') }
  }
  const toggleRule = async (r) => {
    const response = await fetch(`/api/finance/money_rules/${r.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !r.is_active }) })
    if (response.ok) await refresh()
  }
  const deleteRule = async (r) => {
    if (!(await confirm.ask(`Delete rule "${r.rule_text}"?`))) return
    const response = await fetch(`/api/finance/money_rules/${r.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Rule deleted'); await refresh() }
  }
  // /api/kite/login itself falls back to the app owner's Kite app if this user hasn't set up
  // their own (Settings > Kite Connect), so there's always something to try here.
  const connectKite = () => { window.location.href = '/api/kite/login' }
  const linkPortfolioKite = async (p) => {
    setKiteSyncBusy(true)
    try {
      const response = await fetch(`/api/finance/portfolios/${p.id}/link_kite`, { method: 'POST' })
      const result = await response.json()
      if (response.ok) { toast.push(`Linked · ${result.added} holding${result.added === 1 ? '' : 's'} synced from Kite`); await refresh() }
      else { toast.push(result.error || 'Link failed', 'error'); await refresh() }
    } finally { setKiteSyncBusy(false) }
  }
  const unlinkPortfolioKite = async (p) => {
    if (!(await confirm.ask(`Unlink "${p.name}" from Kite? Its holdings stay, but you'll manage them manually from here on.`))) return
    const response = await fetch(`/api/finance/portfolios/${p.id}/unlink_kite`, { method: 'POST' })
    if (response.ok) { toast.push('Unlinked from Kite'); await refresh() } else { toast.push('Unlink failed', 'error') }
  }
  const syncPortfolioKite = async (p) => {
    setKiteSyncBusy(true)
    try {
      const response = await fetch(`/api/finance/portfolios/${p.id}/sync_kite`, { method: 'POST' })
      const result = await response.json()
      if (response.ok) { toast.push(`Synced · ${result.added} added, ${result.updated} updated, ${result.removed} removed`); await refresh() }
      else { toast.push(result.error || 'Sync failed', 'error') }
    } finally { setKiteSyncBusy(false) }
  }
  const syncSipsKite = async () => {
    setKiteSyncBusy(true)
    try {
      const response = await fetch('/api/finance/sips/sync_kite', { method: 'POST' })
      const result = await response.json()
      if (response.ok) { toast.push(`Mutual funds synced · ${result.added} added, ${result.updated} updated, ${result.removed} removed`); await refresh() }
      else { toast.push(result.error || 'Sync failed', 'error') }
    } finally { setKiteSyncBusy(false) }
  }

  const deleteTx = async (t) => {
    if (!(await confirm.ask('Delete this transaction? Balances will be recomputed.'))) return
    const { queued } = await mutate({ table: 'transactions', method: 'DELETE', id: t.id })
    toast.push(queued ? 'Transaction deleted — will sync when back online' : 'Transaction deleted')
  }
  // Mobile's long-press-to-select flow (TransactionsView) deletes in bulk rather than one confirm
  // dialog per row. Returns whether it actually went through, so the caller only clears the
  // selection on a real delete — not when the user backs out of the confirm.
  const deleteTxBulk = async (ids) => {
    if (ids.length === 0) return false
    const n = ids.length
    if (!(await confirm.ask(`Delete ${n} transaction${n === 1 ? '' : 's'}? Balances will be recomputed.`))) return false
    const results = await Promise.all(ids.map((id) => mutate({ table: 'transactions', method: 'DELETE', id })))
    const queuedCount = results.filter((r) => r.queued).length
    toast.push(queuedCount > 0 ? `${n} transaction${n === 1 ? '' : 's'} deleted — ${queuedCount} will sync when back online` : `${n} transaction${n === 1 ? '' : 's'} deleted`)
    return true
  }
  const deleteAccount = async (a) => {
    if (!(await confirm.ask(`Delete "${a.name}"? Its transactions stay but lose the account link.`))) return
    const { queued } = await mutate({ table: 'accounts', method: 'DELETE', id: a.id })
    toast.push(queued ? 'Account deleted — will sync when back online' : 'Account deleted')
  }
  const syncAccountBalance = async (account, targetBalance) => {
    const response = await fetch(`/api/finance/accounts/${account.id}/sync_balance`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_balance: targetBalance }) })
    const data = await response.json()
    if (response.ok) { toast.push('Balance synced'); await refresh() } else { toast.push(data.error || 'Sync failed', 'error') }
  }
  const deleteCategory = async (c) => {
    if (!(await confirm.ask(`Delete category "${c.name}"?`))) return
    const { queued } = await mutate({ table: 'categories', method: 'DELETE', id: c.id })
    toast.push(queued ? 'Category deleted — will sync when back online' : 'Category deleted')
  }
  // Swaps order_index between two adjacent categories/accounts — a plain two-PATCH swap rather
  // than a dedicated bulk-reorder endpoint, since the list only ever moves one step at a time.
  // Each PATCH response already returns the full updated row, so — same as onSaveProfile — these
  // merge straight into local state instead of paying for a full refresh() (a 19-table re-fetch)
  // on every single click, which is what made the Settings checkboxes/reorder feel sluggish.
  const reorderCategory = async (a, b) => {
    if (!b) return
    const [r1, r2] = await Promise.all([
      fetch(`/api/finance/categories/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_index: b.order_index ?? 0 }) }),
      fetch(`/api/finance/categories/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_index: a.order_index ?? 0 }) }),
    ])
    if (!r1.ok || !r2.ok) { toast.push('Reorder failed', 'error'); return }
    const [u1, u2] = await Promise.all([r1.json(), r2.json()])
    setData((d) => ({ ...d, categories: d.categories.map((cat) => (cat.id === u1.id ? u1 : cat.id === u2.id ? u2 : cat)) }))
  }
  const toggleCategoryModule = async (c, moduleKey) => {
    const hidden = c.hidden_in_modules || []
    const next = hidden.includes(moduleKey) ? hidden.filter((m) => m !== moduleKey) : [...hidden, moduleKey]
    const response = await fetch(`/api/finance/categories/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hidden_in_modules: next }) })
    if (!response.ok) { toast.push('Update failed', 'error'); return }
    const updated = await response.json()
    setData((d) => ({ ...d, categories: d.categories.map((cat) => (cat.id === updated.id ? updated : cat)) }))
  }
  // Drag-and-drop can move an account more than one position in a single drop, unlike the old
  // arrow buttons (always an adjacent swap) — so this PATCHes every account whose index actually
  // shifted, not just two, still in parallel and merged straight into local state.
  const reorderAccounts = async (nextOrder) => {
    const changed = nextOrder.map((a, i) => ({ a, i })).filter(({ a, i }) => (a.order_index ?? 0) !== i)
    if (changed.length === 0) return
    const results = await Promise.all(changed.map(({ a, i }) =>
      fetch(`/api/finance/accounts/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_index: i }) }),
    ))
    if (results.some((r) => !r.ok)) { toast.push('Reorder failed', 'error'); return }
    const updated = await Promise.all(results.map((r) => r.json()))
    setData((d) => ({ ...d, accounts: d.accounts.map((acc) => updated.find((u) => u.id === acc.id) || acc) }))
  }
  const openSettings = (section) => { setSettingsSection(section); setView('profile') }

  // Mobile-only: which "add" action the floating + button performs depends on the active module
  // and, for modules with a list/detail split, whether the user has drilled into a single item
  // (activeDetailId, reported up by the view itself — see its useEffect). Desktop keeps each
  // module's own "+ Add" button instead of relying on this FAB.
  const runFabAction = () => {
    switch (view) {
      case 'accounts':
        return activeDetailId ? openTxForm(null, activeDetailId) : openAccForm()
      case 'budgets': {
        const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        return openBudgetMonthForm(nextMonth.getFullYear(), nextMonth.getMonth())
      }
      case 'investments':
        return openHoldingForm(activeDetailId || '')
      case 'cards': {
        const card = data.credit_cards.find((c) => c.id === activeDetailId)
        return card ? openCardSpend(card) : openCardForm()
      }
      case 'scholarships': {
        const s = data.scholarships.find((s) => s.id === activeDetailId)
        return s ? openScholarshipPay(s) : openScholarshipForm()
      }
      case 'loans': {
        const loan = data.loans.find((l) => l.id === activeDetailId)
        return loan ? openLoanPay(loan) : openLoanForm()
      }
      case 'lend': {
        const record = data.lend_borrow.find((l) => l.id === activeDetailId)
        return record
          ? openTxForm(null, '', { value: `lend:${record.id}`, type: record.type === 'lent' ? 'income' : 'expense' })
          : openLendForm()
      }
      case 'family_company':
        return activeDetailId ? openMoneyProfileEntryForm(activeDetailId) : openMoneyProfileForm()
      case 'bucket':
        return openBucketForm()
      default:
        return openTxForm()
    }
  }

  const firstName = data.profile?.full_name?.split(' ')?.[0] || user?.user_metadata?.full_name?.split(' ')?.[0] || user?.email?.split('@')?.[0] || 'Deepak'

  const moduleSettings = resolveModuleSettings(data.profile)
  const nav = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { key: 'accounts', label: 'Accounts', icon: Landmark },
    ...orderedEnabledKeys(moduleSettings).filter((k) => NAV_META[k]).map((k) => NAV_META[k]),
  ]
  const avatarUrl = data.profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''
  const netWorthWidgetEnabled = resolveDashboardWidgets(data.profile).net_worth?.enabled
  // Crossfades rather than swapping instantly — matches DESIGN.md's "settle, don't announce"
  // motion language elsewhere (the loading pulse, etc.) instead of a jarring text pop.
  const greetingNode = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={hasGreetedOnce ? 'name-only' : 'welcome-back'}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
        className="inline-block"
      >
        {hasGreetedOnce ? <>{firstName} 👋</> : <><span className="font-normal text-slate-400 light:text-slate-500">Welcome back,</span> {firstName} 👋</>}
      </motion.span>
    </AnimatePresence>
  )
  // Dashboard used to be pinned to `lg:h-screen` with its own internal `overflow-y-auto` region
  // (a separate scrollbar floating mid-page) so its content never had to compete for space with
  // the rest of the page. That's no longer needed now that its cards size themselves rather than
  // fighting for a fixed viewport height — plain document scroll reads as one continuous page
  // instead of a scrollbar-within-a-scrollbar. Profile still opts in; it has its own reasons to
  // want a fixed-height, internally-scrolling shell.
  const fitScreen = view === 'profile'
  // Which 3 destinations sit in the bottom nav's primary slots is user-configurable (Settings >
  // Mobile nav) — everything else the user has enabled, plus Settings, lives one tap away in the
  // "More" sheet instead of each claiming its own slot. Unmodified profiles keep today's default
  // (Home/Ledger/Accounts), since resolveMobileNavSlots falls back to that shape.
  const mobileDestinations = [
    MOBILE_MANDATORY_META.dashboard, MOBILE_MANDATORY_META.transactions, MOBILE_MANDATORY_META.accounts,
    ...orderedEnabledKeys(moduleSettings).filter((k) => NAV_META[k]).map((k) => NAV_META[k]),
  ]
  const mobileNavSlots = resolveMobileNavSlots(data.profile, mobileDestinations.map((d) => d.key))
  const primaryMobileNav = mobileNavSlots.map((key) => mobileDestinations.find((d) => d.key === key)).filter(Boolean)
  const morePanelItems = [...mobileDestinations.filter((d) => !mobileNavSlots.includes(d.key)), { key: 'profile', label: 'Settings', icon: Settings }]
  const isMoreActive = morePanelItems.some((n) => n.key === view)

  // First-login spotlight tour (or a replay from Settings > User guide) — see
  // components/shared/SpotlightTour.jsx and features/onboarding/tourSteps.js.
  const tourOpen = !!data.profile && !loading && (!data.profile.tour_completed_at || forceTour)
  const tourContext = { setView, openSettings, setMoreOpen, primaryMobileNavKeys: mobileNavSlots }
  const closeTour = () => { setForceTour(false); onSaveProfile({ tour_completed_at: new Date().toISOString() }) }

  return (
    <div className="min-h-screen bg-[#080b12] light:bg-[#eef1f6] text-slate-100 light:text-slate-900">
      {toast.view}
      {confirm.view}
      {prompt.view}
      <SpotlightTour steps={TOUR_STEPS} open={tourOpen} context={tourContext} onSkip={closeTour} onFinish={closeTour} />
      <div className="mx-auto flex min-h-screen max-w-[1480px]">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-white/5 light:border-black/5 px-5 py-6 lg:flex lg:sticky lg:top-0 lg:h-screen lg:self-start lg:overflow-y-auto glassy:z-10 glassy:glass-nav glassy:border-r-0">
          <div className="flex items-center gap-3 text-sm font-semibold text-white light:text-slate-900">
            <img src="/logo.png" alt="" className="h-10 w-10 rounded-2xl object-cover" />Personal Finance
          </div>
          <nav className="mt-10 space-y-1">
            {nav.map((n) => (
              <button key={n.key} data-tour={`nav-${n.key}`} onClick={() => setView(n.key)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${view === n.key ? 'bg-white/[.06] light:bg-black/[.04] text-white light:text-slate-900' : 'text-slate-400 light:text-slate-500 hover:bg-white/[.04] hover:light:bg-black/[.03] hover:text-white hover:light:text-slate-900'}`}>
                <n.icon size={17} />{n.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto flex w-full items-center gap-1 rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] p-2.5 glassy:glass-pill">
            <button data-tour="nav-profile" onClick={() => setView('profile')} className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1.5 py-1 text-left transition hover:bg-white/[.06] hover:light:bg-black/[.04] ${view === 'profile' ? 'bg-white/[.06] light:bg-black/[.04]' : ''}`}>
              <div className="relative shrink-0">
                <Avatar src={avatarUrl} name={firstName} email={user?.email} size={36} />
                {pendingCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-[#080b12] bg-amber-300" title={`${pendingCount} change${pendingCount === 1 ? '' : 's'} pending sync`} />}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-white light:text-slate-900">{firstName}</div>
                <div className="truncate text-[11px] text-slate-500">{pendingCount > 0 ? `${pendingCount} pending sync` : user?.email}</div>
              </div>
            </button>
            <button onClick={onLogout} title="Sign out" className="shrink-0 rounded-lg border border-transparent p-2 text-slate-500 transition hover:border-white/10 hover:light:border-black/10 hover:bg-white/5 hover:text-white hover:light:text-slate-900"><LogOut size={15} /></button>
          </div>
        </aside>

        {/* Main */}
        <main className={`min-w-0 flex-1 px-5 pb-24 pt-6 lg:px-10 lg:pb-10 ${fitScreen ? 'flex flex-col lg:h-screen' : ''}`}>
          {view === 'dashboard' && (
            <header className={`flex shrink-0 items-center justify-between ${fitScreen ? 'mb-3' : 'mb-6'}`}>
              {/* Mobile: tappable avatar + name → Settings > Profile (desktop already has this via the sidebar profile button below) */}
              <button type="button" onClick={() => openSettings('profile')} className="-m-1 flex min-w-0 items-center gap-2.5 rounded-xl p-1 text-left transition hover:bg-white/5 lg:hidden">
                <Avatar src={avatarUrl} name={firstName} email={user?.email} size={38} />
                <h1 className="min-w-0 truncate text-lg font-semibold text-white light:text-slate-900">{greetingNode}</h1>
              </button>
              <h1 className="hidden text-lg font-semibold text-white light:text-slate-900 lg:block">{greetingNode}</h1>
              <div className="flex shrink-0 items-center gap-2">
                {pendingCount > 0 && (
                  <button onClick={() => setView('profile')} className="flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-200 light:text-amber-700 lg:hidden">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />{pendingCount} pending
                  </button>
                )}
                {/* On mobile this toggle now lives inside the Net Worth card itself — kept here
                    only as a fallback for when that widget is disabled, so hiding amounts stays
                    reachable either way. Always shown on desktop. */}
                <button type="button" onClick={() => setShowMoney((v) => !v)} aria-label="Hide amounts" aria-pressed={!showMoney} className={`rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5 lg:flex ${netWorthWidgetEnabled ? 'hidden' : 'flex'}`} title={showMoney ? 'Hide amounts' : 'Show amounts'}>
                  {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
            </header>
          )}

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
              <Skeleton className="col-span-full h-72" />
            </div>
          ) : (
            <div className={fitScreen ? 'min-h-0 flex-1 lg:overflow-y-auto' : ''}>
              {view === 'dashboard' && <DashboardView data={data} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onOpenTxForm={() => openTxForm()} setView={setView} onManageMoneyRules={() => openSettings('money_rules')} onPayCardBill={openCardPay} />}
              {view === 'transactions' && <TransactionsView data={data} onOpenTxForm={() => openTxForm()} onEditTx={openTxForm} onDeleteTx={deleteTx} onDeleteTxBulk={deleteTxBulk} onImport={() => setCsvOpen(true)} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onOpenRecurring={openRecurringManager} onPayCardBill={openCardPay} />}
              {view === 'accounts' && <AccountsView data={data} onAdd={() => openAccForm()} onEdit={openAccForm} onDelete={deleteAccount} onDeleteTx={deleteTx} onAddTransaction={(accountId) => openTxForm(null, accountId)} onSyncBalance={syncAccountBalance} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onDetailChange={setActiveDetailId} />}
              {view === 'budgets' && <BudgetsView data={data} onSetMonth={openBudgetMonthForm} onCloseMonth={closeBudgetMonth} onReopenMonth={reopenBudgetMonth} onDeleteMonth={deleteBudgetMonth} onAddYearly={() => openBudgetForm()} onEditYearly={openBudgetForm} onDeleteYearly={deleteBudget} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} />}
              {view === 'investments' && <InvestmentsView data={data} onAddPortfolio={() => openPortfolioForm()} onEditPortfolio={openPortfolioForm} onDeletePortfolio={deletePortfolio} onAddHolding={openHoldingForm} onBulkImport={openBulkImport} onEditHolding={openHoldingEdit} onDeleteHolding={deleteHolding} onRefreshRowPrice={onRefreshRowPrice} onManualPriceEntry={onManualPriceEntry} onRefreshAll={refreshAllPrices} pricesLoading={pricesLoading} onAddFunds={openFundsForm} onWithdrawFunds={openWithdrawForm} onConnectKite={connectKite} onLinkKite={linkPortfolioKite} onUnlinkKite={unlinkPortfolioKite} onSyncKite={syncPortfolioKite} kiteSyncBusy={kiteSyncBusy} onAddSip={openSipForm} onEditSip={openSipForm} onDeleteSip={deleteSip} onSyncSipsKite={syncSipsKite} onAddOtherInvestment={openOtherInvestmentForm} onEditOtherInvestment={openOtherInvestmentEdit} onDeleteOtherInvestment={deleteOtherInvestment} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onDetailChange={setActiveDetailId} />}
              {view === 'cards' && <CreditCardsView data={data} onAdd={() => openCardForm()} onEdit={openCardForm} onDelete={deleteCard} onSpend={openCardSpend} onPay={openCardPay} onDeleteSpend={deleteCardSpend} onDeleteTx={deleteTx} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onDetailChange={setActiveDetailId} />}
              {view === 'scholarships' && <ScholarshipsView data={data} onAdd={() => openScholarshipForm()} onEdit={openScholarshipForm} onDelete={deleteScholarship} onPay={openScholarshipPay} onRefresh={refresh} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} toast={toast} onDetailChange={setActiveDetailId} />}
              {view === 'loans' && <LoansView data={data} onAdd={() => openLoanForm()} onEdit={openLoanForm} onDelete={deleteLoan} onPay={openLoanPay} onDeletePayment={deleteLoanPayment} onSync={syncLoanOutstanding} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onDetailChange={setActiveDetailId} />}
              {view === 'lend' && <LendBorrowView data={data} onAdd={() => openLendForm()} onEdit={openLendForm} onDelete={deleteLend} onDeleteTx={deleteTx} onLogRepayment={(record) => openTxForm(null, '', { value: `lend:${record.id}`, type: record.type === 'lent' ? 'income' : 'expense' })} onManageAccess={openManageLendAccess} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} toast={toast} onDetailChange={setActiveDetailId} />}
              {view === 'family_company' && <FamilyCompanyView data={data} onAddProfile={() => openMoneyProfileForm()} onEditProfile={openMoneyProfileForm} onDeleteProfile={deleteMoneyProfile} onAddEntry={openMoneyProfileEntryForm} onEditEntry={openMoneyProfileEntryEdit} onDeleteEntry={deleteMoneyProfileEntry} onBulkImport={openMoneyProfileBulkImport} onToggleStatus={toggleMoneyProfileStatus} onManageAccess={openManageAccess} onDetailChange={setActiveDetailId} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} />}
              {view === 'bucket' && <BucketListView data={data} onAdd={() => openBucketForm()} onEdit={openBucketForm} onDelete={deleteBucket} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} />}
              {view === 'insights' && <InsightsView data={data} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} />}
              {view === 'profile' && (
                <SettingsShell
                  activeSection={settingsSection} onSectionChange={setSettingsSection}
                  data={data} user={user} theme={theme} onThemeChange={onThemeChange} onSaveProfile={onSaveProfile} toast={toast}
                  onSaveKiteCredentials={saveKiteCredentials} onRemoveKiteCredentials={removeKiteCredentials}
                  accentColor={data.profile?.accent_color} onAccentChange={onAccentChange}
                  onAddCategory={(defaultType) => openCatForm(null, defaultType)} onEditCategory={openCatForm} onDeleteCategory={deleteCategory}
                  onReorderCategory={reorderCategory} onToggleCategoryModule={toggleCategoryModule}
                  onReorderAccounts={reorderAccounts}
                  onAddVaultItem={(type) => openVaultForm(null, type)} onEditVaultItem={openVaultForm} onDeleteVaultItem={deleteVaultItem}
                  onAddRule={addRule} onToggleRule={toggleRule} onDeleteRule={deleteRule}
                  onLogout={onLogout}
                  onReplayTour={() => setForceTour(true)}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Floating quick add — dynamic per module on mobile, see runFabAction; desktop keeps the
          per-module "+ Add" buttons so this is deliberately unaffected there. */}
      <button onClick={runFabAction} className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-accent-300 to-accent-600 text-[#07101c] shadow-2xl shadow-accent-500/30 transition hover:scale-105 lg:bottom-8 lg:right-8 glassy:glass-btn-primary" title="Quick add">
        <Plus size={24} />
      </button>

      <InstallPrompt />

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 light:border-black/10 bg-[#0b0f18]/95 light:bg-white/90 backdrop-blur-xl lg:hidden glassy:glass-nav" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto grid max-w-md grid-cols-4">
          {primaryMobileNav.map((n) => (
            <button key={n.key} data-tour={`nav-${n.key}`} onClick={() => setView(n.key)} className={`flex flex-col items-center gap-1 py-3 text-[11px] ${view === n.key ? 'text-accent-300 light:text-accent-700' : 'text-slate-500'}`}>
              <n.icon size={18} /><span className="max-w-full truncate px-1">{n.label}</span>
            </button>
          ))}
          <button onClick={() => setMoreOpen(true)} className={`flex flex-col items-center gap-1 py-3 text-[11px] ${isMoreActive ? 'text-accent-300 light:text-accent-700' : 'text-slate-500'}`}>
            <MoreHorizontal size={18} />More
          </button>
        </div>
      </nav>

      <BottomSheet open={moreOpen} onOpenChange={setMoreOpen} title="More">
        <div className="grid grid-cols-3 gap-3 pb-4">
          {morePanelItems.map((n) => (
            <button
              key={n.key}
              data-tour={`nav-${n.key}`}
              onClick={() => { setView(n.key); setMoreOpen(false) }}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center text-xs transition glassy:glass-pill ${view === n.key ? 'border-accent-300/30 bg-accent-400/10 text-accent-200 light:text-accent-700' : 'border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] text-slate-300 light:text-slate-700 hover:bg-white/[.06] hover:light:bg-black/[.04]'}`}
            >
              <n.icon size={20} />
              <span>{n.label}</span>
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Modals */}
      <TransactionForm open={txFormOpen} onClose={closeTxForm} onSaved={onTxSaved} editing={txEditing} accounts={data.accounts} categories={data.categories} creditCards={data.credit_cards} lendBorrow={data.lend_borrow} loans={data.loans} transactions={data.transactions} onAddAccount={() => { closeTxForm(); openAccForm() }} onAddCategory={() => openCatForm()} toast={toast} profile={data.profile} defaultAccountId={txDefaultAccountId} defaultRepayment={txDefaultRepayment} mutate={mutate} />
      <AccountForm open={accFormOpen} onClose={closeAccForm} onSaved={onAccSaved} editing={accEditing} accounts={data.accounts} toast={toast} mutate={mutate} />
      <CategoryForm open={catFormOpen} onClose={closeCatForm} onSaved={onCatSaved} editing={catEditing} defaultType={catFormDefaultType} toast={toast} mutate={mutate} />
      <RecurringManager open={recurringManagerOpen} onClose={closeRecurringManager} rules={data.recurring_transactions} onAdd={() => openRecurringForm()} onEdit={openRecurringForm} onToggle={toggleRecurring} onDelete={deleteRecurring} showMoney={showMoney} />
      <RecurringForm open={recurringFormOpen} onClose={closeRecurringForm} onSaved={onRecurringSaved} editing={recurringEditing} accounts={data.accounts} categories={data.categories} toast={toast} />
      <BudgetForm open={budgetFormOpen} onClose={closeBudgetForm} onSaved={onBudgetSaved} editing={budgetEditing} categories={data.categories} toast={toast} mutate={mutate} />
      <BudgetMonthForm
        open={budgetMonthFormOpen} onClose={closeBudgetMonthForm} onSaved={onBudgetMonthSaved}
        initialYear={budgetMonthFormInitial.year} initialMonth={budgetMonthFormInitial.month}
        budgetMonths={data.budget_months} budgetMonthCategories={data.budget_month_categories}
        categories={data.categories} onAddCategory={() => openCatForm()} toast={toast}
      />
      <CsvImport open={csvOpen} onClose={() => setCsvOpen(false)} onImported={async () => { setCsvOpen(false); await refresh() }} accounts={data.accounts} categories={data.categories} transactions={data.transactions} toast={toast} />
      <PortfolioForm open={portfolioFormOpen} onClose={closePortfolioForm} onSaved={onPortfolioSaved} editing={portfolioEditing} accounts={data.accounts} toast={toast} mutate={mutate} />
      <HoldingForm open={holdingFormOpen} onClose={closeHoldingForm} onSaved={onHoldingSaved} editing={holdingEditing} portfolios={data.portfolios} defaultPortfolioId={holdingDefaultPortfolio} profile={data.profile} toast={toast} mutate={mutate} />
      <OtherInvestmentForm open={otherInvestmentFormOpen} onClose={closeOtherInvestmentForm} onSaved={onOtherInvestmentSaved} editing={otherInvestmentEditing} portfolioId={otherInvestmentPortfolioId} toast={toast} mutate={mutate} />
      <HoldingsBulkImport open={bulkImportOpen} onClose={closeBulkImport} onImported={onBulkImported} portfolio={bulkImportPortfolio} toast={toast} />
      <LoanForm open={loanFormOpen} onClose={closeLoanForm} onSaved={onLoanSaved} editing={loanEditing} accounts={data.accounts} toast={toast} />
      <LoanPaymentForm open={loanPayOpen} onClose={closeLoanPay} onSaved={onLoanPaid} loan={loanPayLoan} accounts={data.accounts} creditCards={data.credit_cards} toast={toast} />
      <BucketForm open={bucketFormOpen} onClose={closeBucketForm} onSaved={onBucketSaved} editing={bucketEditing} toast={toast} mutate={mutate} />
      <LendForm open={lendFormOpen} onClose={closeLendForm} onSaved={onLendSaved} editing={lendEditing} accounts={data.accounts} creditCards={data.credit_cards} toast={toast} />
      <ManageLendAccessSheet open={manageLendAccessOpen} onClose={closeManageLendAccess} record={manageLendAccessRecord} toast={toast} />
      <PortfolioFundsForm open={fundsFormOpen} onClose={closeFundsForm} onSaved={onFundsSaved} portfolio={fundsPortfolio} accounts={data.accounts} toast={toast} />
      <WithdrawFundsForm open={withdrawFormOpen} onClose={closeWithdrawForm} onSaved={onWithdrawSaved} portfolio={withdrawPortfolio} accounts={data.accounts} toast={toast} />
      <SipForm open={sipFormOpen} onClose={closeSipForm} onSaved={onSipSaved} editing={sipEditing} portfolios={data.portfolios} toast={toast} mutate={mutate} />
      <CreditCardForm open={cardFormOpen} onClose={closeCardForm} onSaved={onCardSaved} editing={cardEditing} toast={toast} mutate={mutate} />
      <VaultItemForm open={vaultFormOpen} onClose={closeVaultForm} onSaved={onVaultSaved} editing={vaultEditing} accounts={data.accounts} toast={toast} defaultType={vaultDefaultType} />
      <CardSpendForm open={cardSpendOpen} onClose={closeCardSpend} onSaved={onCardSpendSaved} card={cardSpendTarget} categories={data.categories} toast={toast} />
      <CardPayForm open={cardPayOpen} onClose={closeCardPay} onSaved={onCardPaid} card={cardPayTarget} accounts={data.accounts} toast={toast} />
      <ScholarshipForm open={scholarshipFormOpen} onClose={closeScholarshipForm} onSaved={onScholarshipSaved} editing={scholarshipEditing} accounts={data.accounts} toast={toast} />
      <ScholarshipPayForm open={scholarshipPayOpen} onClose={closeScholarshipPay} onSaved={onScholarshipPaid} scholarship={scholarshipPayTarget} accounts={data.accounts} toast={toast} />
      <MoneyProfileForm open={moneyProfileFormOpen} onClose={closeMoneyProfileForm} onSaved={onMoneyProfileSaved} editing={moneyProfileEditing} accounts={data.accounts} toast={toast} mutate={mutate} />
      <MoneyProfileEntryForm open={moneyProfileEntryFormOpen} onClose={closeMoneyProfileEntryForm} onSaved={onMoneyProfileEntrySaved} editing={moneyProfileEntryEditing} profile={data.money_profiles?.find((p) => p.id === moneyProfileEntryProfileId)} categories={categoriesFor(data.money_profiles?.find((p) => p.id === moneyProfileEntryProfileId) || {}, data.categories)} onAddCategory={(data.money_profiles?.find((p) => p.id === moneyProfileEntryProfileId)?.my_role || 'owner') === 'owner' ? () => openCatForm() : undefined} toast={toast} />
      <MoneyProfileBulkImport open={moneyProfileBulkImportOpen} onClose={closeMoneyProfileBulkImport} onImported={onMoneyProfileBulkImported} profile={moneyProfileBulkImportProfile} categories={categoriesFor(moneyProfileBulkImportProfile || {}, data.categories)} toast={toast} />
      <ManageAccessSheet open={manageAccessOpen} onClose={closeManageAccess} profile={manageAccessProfile} toast={toast} />
    </div>
  )
}

/* ---------------- Root ---------------- */
function AppInner() {
  const [user, setUser] = useState(undefined)
  const [authError, setAuthError] = useState('')
  // next-themes persists the chosen theme to localStorage, which is per-browser, not per-account —
  // reset to the one true default on sign-out so it can't leak into whichever account signs in
  // next on this same browser (the pre-login AuthScreen itself is always dark regardless, but the
  // authenticated shell would otherwise flash the previous account's theme before its own profile
  // loads and corrects it).
  const { setTheme } = useTheme()
  // React StrictMode (on by default in dev) intentionally double-invokes a fresh mount's effects
  // to surface cleanup bugs — harmless in itself, but this effect has no cleanup, so without this
  // guard it fires the real /api/auth/me network round trip twice on every single page load.
  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    const params = new URLSearchParams(window.location.search)
    const err = params.get('auth_error')
    if (err) setAuthError(err)
    if (err || params.has('code') || params.has('state')) {
      params.delete('auth_error'); params.delete('code'); params.delete('state')
      const qs = params.toString()
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''))
    }
    // AbortSignal.timeout guards against a hung request (server down, a deadlocked query) —
    // without it, a request that never settles leaves `user` at `undefined` forever and
    // <LoadingScreen /> spins with no way out. A timeout rejects the fetch, which lands in the
    // same offline/network-failure `.catch()` below rather than needing its own fallback path.
    fetch('/api/auth/me', { signal: AbortSignal.timeout(15000) })
      .then((r) => r.ok ? r.json() : { user: null })
      .catch(async () => {
        // The request itself failed (offline, DNS, a timeout, etc.) rather than the server
        // explicitly saying "not authenticated" — those are different things. A real 401 here
        // means "log this browser out"; a network failure with no server opinion at all
        // shouldn't bounce a previously-signed-in user to the landing page when there's cached
        // data from their last session sitting right there in Dexie, ready to paint. Only fall
        // back to a minimal user reconstructed from that cache here — an actual 401 still wins.
        const cached = await loadSnapshot().catch(() => null)
        return { user: cached?.profile?.id ? { id: cached.profile.id } : null }
      })
      .then((d) => setUser(d.user))
  }, [])
  if (user === undefined) return <LoadingScreen />
  if (!user) return <AuthScreen onAuth={setUser} initialError={authError} />
  return <Shell user={user} onLogout={async () => { await fetch('/api/auth/logout', { method: 'POST' }); await clearSnapshot().catch(() => {}); setTheme('dark'); setUser(null) }} />
}

// Respects prefers-reduced-motion for every Framer Motion animation in the app (pulse loading,
// future page/tab transitions) with zero per-component logic — one global switch.
export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppInner />
    </MotionConfig>
  )
}
