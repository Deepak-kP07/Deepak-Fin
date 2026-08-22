'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { removeAttachment, uploadAttachment, viewAttachment } from '@/lib/attachments'
import { calcEmi, daysBetween, projectSchedule, totalInterest } from '@/lib/amortization'
import {
  MONTH_NAMES, addMonthsToDate, formatDate, formatDateTime, liveOutstanding, maskedMoney, money, money2,
  monthAbbr, monthName, ordinal, paymentTypeLabel, todayISO,
} from '@/lib/format'
import { PALETTE } from '@/lib/palette'
import { useToast } from '@/components/shared/Toast'
import { useConfirm } from '@/components/shared/ConfirmDialog'
import { usePrompt } from '@/components/shared/PromptDialog'
import { Select } from '@/components/shared/Select'
import { CsvBulkImport } from '@/components/shared/CsvBulkImport'
import { CategorySelect } from '@/components/shared/CategorySelect'
import { DateInput } from '@/components/shared/DateInput'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/shared/Skeleton'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { Avatar } from '@/components/shared/Avatar'
import { CreditCardBillAlert } from '@/components/shared/CreditCardBillAlert'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { CategoryForm } from '@/features/categories/CategoryForm'
import { CategoriesView } from '@/features/categories/CategoriesView'
import { MoneyRulesWidget } from '@/features/money-rules/MoneyRulesWidget'
import { MoneyRulesView } from '@/features/money-rules/MoneyRulesView'
import { AccountForm } from '@/features/accounts/AccountForm'
import { AccountsView } from '@/features/accounts/AccountsView'
import { BudgetForm } from '@/features/budgets/BudgetForm'
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
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts'
import {
  ArrowDownRight, ArrowLeftRight, ArrowUpDown, ArrowUpRight, BarChart3, Briefcase, Calendar, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, CreditCard,
  Download, Eye, EyeOff, FileText, Heart, History, Landmark, LayoutDashboard, LineChart, ListChecks, LogOut, Menu, MoreVertical, Mountain, Paperclip, PieChart as PieChartIcon, PiggyBank, Plus,
  RefreshCw, Repeat, Search, ShieldCheck, Sparkles, Star, Tag, Target, TrendingDown, TrendingUp, Trash2, Pencil, Users,
  Wallet, X, Zap,
} from 'lucide-react'

/* ---------------- Transaction Form ---------------- */
function TransactionForm({ open, onClose, onSaved, editing, accounts, categories, creditCards = [], lendBorrow = [], loans = [], onAddAccount, onAddCategory, toast, profile, defaultAccountId = '', defaultRepayment = null }) {
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
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState(null)
  const confirm = useConfirm()
  useEffect(() => { setForm(initial); setPurposeMode(initial.repay_value ? 'repayment' : 'category'); setAttachmentFile(null); setAttachmentRemoved(false); setHistoryOpen(false); setHistory(null) }, [initial])

  if (!open) return null

  const toggleHistory = async () => {
    if (historyOpen) { setHistoryOpen(false); return }
    setHistoryOpen(true)
    if (!history) {
      const response = await fetch(`/api/finance/transactions/${editing.id}/history`)
      setHistory(response.ok ? await response.json() : [])
    }
  }
  const catsForType = categories.filter((c) => c.type === (form.type === 'income' ? 'income' : 'expense'))
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

      if (purposeMode === 'repayment' && typeof form.account_id === 'string' && form.account_id.startsWith('cc:')) {
        throw new Error('Choose a bank, cash, or debit account to pay a repayment from — credit cards aren’t supported for this yet.')
      }

      if (form.type === 'transfer' && typeof form.to_account_id === 'string' && form.to_account_id.startsWith('cc:')) {
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
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')

      if (attachmentRemoved && editing?.attachment_path) {
        await removeAttachment(`/api/finance/transactions/${data.id}/attachment`)
      }
      if (attachmentFile) {
        const { error: uploadError } = await uploadAttachment(`/api/finance/transactions/${data.id}`, data.id, attachmentFile)
        if (uploadError) toast.push('Transaction saved, but the attachment failed to upload', 'error')
      }

      toast.push(editing ? 'Transaction updated' : 'Transaction added')
      onSaved()
    } catch (e) { toast.push(e.message, 'error') } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#141a28] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{editing ? 'Edit transaction' : 'Add transaction'}</h2>
            <p className="mt-1 text-xs text-slate-500">Keep the context, not just the number</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {[{ v: 'expense', l: 'Expense', c: 'bg-rose-400/15 text-rose-200 border-rose-400/30' }, { v: 'income', l: 'Income', c: 'bg-emerald-400/15 text-emerald-200 border-emerald-400/30' }, { v: 'transfer', l: 'Transfer', c: 'bg-cyan-400/15 text-cyan-200 border-cyan-400/30' }].map((t) => (
            <button key={t.v} type="button" onClick={() => { setPurposeMode('category'); setForm({ ...form, type: t.v, category_id: t.v === 'transfer' ? '' : (categories.find((c) => c.type === (t.v === 'income' ? 'income' : 'expense'))?.id || ''), linked_module: '', linked_module_id: '', repay_value: '' }) }} className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${form.type === t.v ? t.c : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>{t.l}</button>
          ))}
        </div>

        {!hasAnySource && (
          <div className="mt-5 rounded-xl border border-amber-300/25 bg-amber-300/5 px-4 py-3 text-sm text-amber-200">
            <div className="flex items-center gap-2"><Landmark size={14} /> You don&apos;t have any accounts yet.</div>
            <button type="button" onClick={onAddAccount} className="mt-2 rounded-lg bg-amber-300/20 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-300/30">+ Add your first account</button>
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-300">Amount
            <input required min="0.01" step="0.01" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="0.00" />
          </label>
          <label className="text-sm text-slate-300">Date
            <DateInput value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value, time: new Date().toTimeString().slice(0, 5) })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>

          <label className="text-sm text-slate-300">{form.type === 'transfer' ? 'From account' : 'Account'}
            <Select required={hasAnySource} value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none focus:border-cyan-300/50">
              <option value="">Choose account…</option>
              {sourceOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </label>

          {form.type === 'transfer' ? (
            <label className="text-sm text-slate-300">To account
              <Select required value={form.to_account_id} onChange={(e) => setForm({ ...form, to_account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none focus:border-cyan-300/50">
                <option value="">Choose destination…</option>
                {realAccounts.filter((a) => a.id !== form.account_id).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                {creditCards.filter((c) => Number(c.current_outstanding) > 0).map((c) => <option key={c.id} value={`cc:${c.id}`}>{c.name} · pay bill</option>)}
              </Select>
            </label>
          ) : (
            <div className="text-sm text-slate-300 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span>{purposeMode === 'repayment' ? (form.type === 'income' ? 'Repayment from' : 'Repaying') : 'Category'}</span>
                {canRepay && (
                  <div className="flex gap-1">
                    <button type="button" onClick={() => resetPurpose('category')} className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${purposeMode === 'category' ? 'bg-cyan-400/15 text-cyan-200' : 'text-slate-500 hover:bg-white/5'}`}>Category</button>
                    <button type="button" onClick={() => resetPurpose('repayment')} className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${purposeMode === 'repayment' ? 'bg-cyan-400/15 text-cyan-200' : 'text-slate-500 hover:bg-white/5'}`}>Repayment</button>
                  </div>
                )}
              </div>
              {purposeMode === 'repayment' && canRepay ? (
                <>
                  <Select required value={form.repay_value || ''} onChange={(e) => setForm({ ...form, repay_value: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none focus:border-cyan-300/50">
                    <option value="">Choose…</option>
                    {repayOptions.map((o) => <option key={`${o.kind}:${o.id}`} value={`${o.kind}:${o.id}`}>{o.label}</option>)}
                  </Select>
                  <div className="mt-1 text-[11px] text-slate-500">Auto-marks the debt as partially/fully repaid.</div>
                </>
              ) : (
                <CategorySelect value={form.category_id || ''} onChange={(e) => setForm({ ...form, category_id: e.target.value })} categories={catsForType} onAddCategory={onAddCategory} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
              )}
            </div>
          )}

          <label className="text-sm text-slate-300 sm:col-span-2">Description
            <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder={form.type === 'income' ? 'e.g. Salary, stipend, refund' : form.type === 'transfer' ? 'e.g. Moved to savings' : 'e.g. Groceries at BigBazaar'} />
          </label>
          <label className="text-sm text-slate-300 sm:col-span-2">Notes
            <input value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Optional context" />
          </label>

          <div className="text-sm text-slate-300 sm:col-span-2">
            Receipt / attachment
            {editing?.attachment_path && !attachmentRemoved ? (
              <div className="mt-2 flex items-center justify-between rounded-xl border border-white/10 bg-white/[.04] px-3 py-3">
                <button type="button" onClick={() => viewAttachment(`/api/finance/transactions/${editing.id}/attachment`)} className="flex min-w-0 items-center gap-2 truncate text-sm text-cyan-200 hover:underline"><Paperclip size={14} className="shrink-0 text-slate-500" />{editing.attachment_name || 'Attachment'}</button>
                <button type="button" onClick={() => setAttachmentRemoved(true)} className="shrink-0 rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={14} /></button>
              </div>
            ) : (
              <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[.02] px-3 py-3 text-sm text-slate-400 hover:bg-white/[.04]">
                <Paperclip size={14} />
                {attachmentFile ? attachmentFile.name : 'Attach a photo of the receipt (optional)'}
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} />
              </label>
            )}
          </div>

          {editing && (
            <div className="sm:col-span-2">
              <button type="button" onClick={toggleHistory} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300"><History size={13} />{historyOpen ? 'Hide edit history' : 'View edit history'}</button>
              {historyOpen && (
                <div className="mt-2 space-y-1.5 rounded-xl border border-white/10 bg-white/[.02] p-3">
                  {history === null ? (
                    <div className="text-xs text-slate-500">Loading…</div>
                  ) : history.length === 0 ? (
                    <div className="text-xs text-slate-500">No edits recorded yet.</div>
                  ) : history.map((h) => (
                    <div key={h.id} className="text-xs text-slate-400">
                      <span className="text-slate-500">{formatDateTime(h.changed_at?.slice(0, 10), h.changed_at?.slice(11, 16))}</span>{' — '}
                      {Object.entries(h.previous_values).map(([field, prev]) => `${field} was "${prev}"`).join(', ')}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button disabled={busy || !hasAnySource} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">
          {busy ? 'Saving…' : editing ? 'Update transaction' : 'Save transaction'} <ChevronRight size={16} />
        </button>
      </form>
      {confirm.view}
    </div>
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
        <label className="text-sm text-slate-300 sm:col-span-2">Default account
          <Select value={defaultAccount} onChange={(e) => setDefaultAccount(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-2.5 text-white outline-none">
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
          <td className="px-3 py-2 text-slate-400">{p.valid ? formatDate(p.date) : '—'}</td>
          <td className="px-3 py-2 text-slate-300">
            {p.description}
            {p.duplicate && <span className="ml-2 rounded-full bg-amber-300/15 px-1.5 py-0.5 text-[10px] text-amber-200">possible duplicate</span>}
            {!p.valid && <span className="ml-2 rounded-full bg-rose-300/15 px-1.5 py-0.5 text-[10px] text-rose-200">unreadable amount</span>}
          </td>
          <td className="px-3 py-2 capitalize text-slate-400">{p.type}</td>
          <td className="px-3 py-2 text-slate-400">{p.categoryLabel}</td>
          <td className="px-3 py-2 text-right text-slate-300">{p.valid ? money(p.amount) : '—'}</td>
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

/* ---------------- Profile View ---------------- */
function ProfileView({ data, user, theme, onThemeChange, onSaveProfile, onAddCategory, onEditCategory, onDeleteCategory, onLogout }) {
  const { profile, categories } = data
  const [form, setForm] = useState({ full_name: '', age: '', avatar_url: '' })
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name || '', age: profile.age ?? '', avatar_url: profile.avatar_url || '' })
  }, [profile])
  const save = async () => {
    setBusy(true)
    try { await onSaveProfile({ ...form, age: form.age === '' ? null : Number(form.age) }) } finally { setBusy(false) }
  }
  const grouped = { income: categories.filter((c) => c.type === 'income'), expense: categories.filter((c) => c.type === 'expense') }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 text-xs uppercase tracking-widest text-cyan-200/70">Your space</div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Profile &amp; settings</h1>
        </div>
        <button onClick={onLogout} className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400 hover:bg-white/5"><LogOut size={13} />Sign out</button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <Avatar src={form.avatar_url} name={form.full_name} email={user?.email} size={84} rounded="rounded-2xl" />
          <div className="grid flex-1 gap-3.5 sm:grid-cols-2">
            <label className="text-sm text-slate-300">Full name
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-2.5 text-white outline-none focus:border-cyan-300/50" placeholder="Deepak Perumal" />
            </label>
            <label className="text-sm text-slate-300">Age
              <input type="number" min="1" max="150" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-2.5 text-white outline-none focus:border-cyan-300/50" />
            </label>
            <div className="text-sm text-slate-300">
              <div className="text-xs text-slate-500">Email</div>
              <div className="mt-1 text-white">{user?.email}</div>
            </div>
            <label className="text-sm text-slate-300">Avatar URL <span className="text-[11px] text-slate-600">(auto-filled from Google)</span>
              <input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-2.5 text-xs text-slate-300 outline-none focus:border-cyan-300/50" placeholder="https://…" />
            </label>
          </div>
        </div>
        <button onClick={save} disabled={busy} className="mt-5 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-6 py-2.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : 'Save profile'}</button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
        <div className="text-sm font-semibold text-white">Theme</div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {[{ v: 'dark', l: 'Dark', c: 'from-slate-900 to-slate-700' }, { v: 'midnight', l: 'Midnight', c: 'from-[#0b1220] to-[#1e2a44]' }, { v: 'ocean', l: 'Ocean', c: 'from-cyan-900 to-blue-950' }].map((t) => (
            <button key={t.v} onClick={() => onThemeChange(t.v)} className={`rounded-xl border p-3 text-left transition ${theme === t.v ? 'border-cyan-300/50 bg-cyan-400/10' : 'border-white/10 hover:bg-white/[.04]'}`}>
              <div className={`h-10 rounded-lg bg-gradient-to-br ${t.c}`} />
              <div className="mt-2 text-sm font-medium text-white">{t.l}</div>
              {theme === t.v && <div className="text-[11px] text-cyan-300">Active</div>}
            </button>
          ))}
        </div>
        <div className="mt-2 text-[11px] text-slate-500">Currently only dark themes; light mode coming soon.</div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
        <div className="text-sm font-semibold text-white">Spending guardrails</div>
        <div className="mt-3 flex items-center justify-between gap-4 rounded-xl bg-black/20 px-4 py-3">
          <div>
            <div className="text-sm text-white">Block transactions when an account is short</div>
            <div className="mt-0.5 text-xs text-slate-500">When a bank, cash, or debit card doesn't have enough balance: {profile?.block_insufficient_funds !== false ? 'blocked outright' : 'allowed with a "confirm anyway" prompt'}. Credit cards always block past their limit, regardless of this setting.</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={profile?.block_insufficient_funds !== false}
            onClick={() => onSaveProfile({ block_insufficient_funds: profile?.block_insufficient_funds === false })}
            className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${profile?.block_insufficient_funds !== false ? 'bg-cyan-400' : 'bg-white/15'}`}
          >
            <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${profile?.block_insufficient_funds !== false ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
        <div className="text-sm font-semibold text-white">Optional modules</div>
        <div className="mt-3 flex items-center justify-between gap-4 rounded-xl bg-black/20 px-4 py-3">
          <div>
            <div className="text-sm text-white">Scholarships module</div>
            <div className="mt-0.5 text-xs text-slate-500">Track scholarship batches received and payments made to college. Off by default — turn on if this applies to you.</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!profile?.scholarships_enabled}
            onClick={() => onSaveProfile({ scholarships_enabled: !profile?.scholarships_enabled })}
            className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${profile?.scholarships_enabled ? 'bg-cyan-400' : 'bg-white/15'}`}
          >
            <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${profile?.scholarships_enabled ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Categories</div>
            <div className="text-xs text-slate-500">Group your income and expenses your way</div>
          </div>
          <button onClick={onAddCategory} className="flex items-center gap-1 rounded-xl bg-white/[.06] px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/[.1]"><Plus size={13} />Add</button>
        </div>
        <div className="mt-3 grid max-h-56 gap-4 overflow-y-auto md:grid-cols-2">
          {['income', 'expense'].map((k) => (
            <div key={k}>
              <div className="mb-2 text-[10px] uppercase tracking-widest text-slate-500">{k}</div>
              <div className="space-y-1.5">
                {grouped[k].length === 0 ? <div className="text-sm text-slate-500">No categories</div> : grouped[k].map((c) => (
                  <div key={c.id} className="group flex items-center justify-between rounded-xl bg-black/20 px-3 py-1.5">
                    <div className="flex items-center gap-3"><div className="h-6 w-6 rounded-md" style={{ background: `${c.color || '#94a3b8'}33`, color: c.color }} /><span className="text-sm text-white">{c.name}</span></div>
                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button onClick={() => onEditCategory(c)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={13} /></button>
                      <button onClick={() => onDeleteCategory(c)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TransactionTicker({ items, categories, accounts, creditCards = [], showMoney }) {
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
    <div ref={boxRef} className="min-h-0 flex-1 overflow-hidden border-t border-white/10">
      <div ref={trackRef} className={scroll ? 'ticker-track' : ''} style={scroll ? { animationDuration: `${duration}s` } : undefined}>
        {list.map((t, i) => {
          const cat = categories.find((c) => c.id === t.category_id)
          const acc = accounts.find((a) => a.id === t.account_id) || (t.linked_module === 'credit_card' ? creditCards.find((c) => c.id === t.linked_module_id) : null)
          const sign = t.type === 'income' || (t.type === 'transfer' && t.transfer_direction === 'in') ? '+' : '-'
          const color = t.type === 'income' || (t.type === 'transfer' && t.transfer_direction === 'in') ? 'text-emerald-300' : t.type === 'transfer' ? 'text-cyan-300' : 'text-rose-300'
          return (
            <div key={`${t.id}-${i}`} className="flex items-center justify-between gap-3 border-b border-white/5 px-3.5 py-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[.05]" style={{ color: cat?.color || '#94a3b8' }}>
                  {t.type === 'transfer' ? <ArrowLeftRight size={14} /> : t.type === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">{t.description}</div>
                  <div className="truncate text-[11px] text-slate-500">{cat?.name || (t.type === 'transfer' ? 'Transfer' : 'Uncategorised')}{acc ? ` · ${acc.name}` : ''} · {formatDateTime(t.date, t.time)}</div>
                </div>
              </div>
              <div className={`shrink-0 text-right text-sm font-semibold ${color}`}>{showMoney ? `${sign}${money(t.amount).replace('-', '')}` : '••••'}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ---------------- Views ---------------- */
function DashboardView({ data, showMoney, onOpenTxForm, setView, onAddRule, onPayCardBill }) {
  const { accounts, transactions, categories, holdings = [], loans = [], loan_payments = [], bucket_list = [], money_rules = [], credit_cards = [], portfolios = [] } = data
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
  const netWorth = totalBalance + currentInv - totalOutstanding
  // Monthly aggregation for last 6 months
  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: monthName(d), income: 0, expense: 0 }) }
  transactions.forEach((t) => {
    if (t.type === 'transfer') return
    const d = new Date(t.date); const key = `${d.getFullYear()}-${d.getMonth()}`
    const bucket = months.find((m) => m.key === key)
    if (bucket) bucket[t.type] += Number(t.amount || 0)
  })
  const thisMonth = months[months.length - 1]
  const savingsRate = thisMonth?.income > 0 ? Math.round(((thisMonth.income - thisMonth.expense) / thisMonth.income) * 100) : 0
  const nowMonthKey = `${now.getFullYear()}-${now.getMonth()}`
  const recent = transactions.filter((t) => {
    const d = new Date(t.date)
    return `${d.getFullYear()}-${d.getMonth()}` === nowMonthKey
  }).slice(0, 15)

  // Consolidated balances: bank accounts, credit cards (as debt), investment portfolios.
  // Debit cards are excluded — they share their linked account's balance, already listed here.
  const balanceItems = [
    ...accounts.filter((a) => a.type !== 'debit_card').map((a) => ({
      id: `acc-${a.id}`, name: a.name, sub: a.type.replace('_', ' '), amount: Number(a.current_balance || 0),
      icon: a.type === 'cash' ? Wallet : Landmark, color: a.color || '#22d3ee', debt: false,
    })),
    ...credit_cards.map((c) => ({
      id: `cc-${c.id}`, name: c.name, sub: 'Credit card', amount: Number(c.current_outstanding || 0),
      icon: CreditCard, color: c.color || '#f472b6', debt: true,
    })),
    ...portfolios.map((p) => {
      const value = holdings.filter((h) => h.portfolio_id === p.id).reduce((s, h) => s + Number(h.qty) * Number(h.current_price || h.avg_buy_price), 0) + Number(p.cash_balance || 0)
      return { id: `port-${p.id}`, name: p.name, sub: 'Investment', amount: value, icon: TrendingUp, color: p.color || '#a78bfa', debt: false }
    }),
  ]

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <CreditCardBillAlert creditCards={credit_cards} transactions={transactions} onPay={onPayCardBill} showMoney={showMoney} />
      <div className="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Net worth" value={showMoney ? money(netWorth) : '••••••'} sub={<span className="flex items-center gap-1"><ArrowUpRight size={13} />Cash + Investments − Debt</span>} icon={PiggyBank} accent="bg-gradient-to-br from-cyan-300 to-blue-500 text-[#07101c]" />
        <StatCard label={`Income · ${thisMonth?.label || ''}`} value={showMoney ? money(thisMonth?.income || 0) : '••••'} sub={<span className="flex items-center gap-1"><ArrowUpRight size={13} />This month</span>} icon={TrendingUp} accent="bg-emerald-400/15 text-emerald-200" />
        <StatCard label={`Expense · ${thisMonth?.label || ''}`} value={showMoney ? money(thisMonth?.expense || 0) : '••••'} sub={<span className="flex items-center gap-1 text-rose-300"><ArrowDownRight size={13} />This month</span>} icon={TrendingDown} accent="bg-rose-400/15 text-rose-200" tone="text-rose-300" />
        <StatCard label="Savings rate" value={`${savingsRate}%`} sub={<span className={savingsRate >= 20 ? 'text-emerald-300' : 'text-amber-300'}>{savingsRate >= 20 ? 'Great pace' : 'Aim for 20%+'}</span>} icon={Target} accent="bg-violet-400/15 text-violet-200" tone={savingsRate >= 20 ? 'text-emerald-300' : 'text-amber-300'} />
      </div>

      {(holdings.length > 0 || loans.length > 0 || bucket_list.length > 0) && (
        <div className="grid shrink-0 gap-3 sm:grid-cols-3">
          {holdings.length > 0 && (
            <button onClick={() => setView('investments')} className="rounded-xl border border-white/10 bg-white/[.035] p-3 text-left transition hover:bg-white/[.06]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Portfolio</span>
                <TrendingUp size={14} className="text-violet-300" />
              </div>
              <div className="mt-1.5 text-lg font-semibold text-white">{showMoney ? money(currentInv) : '••••'}</div>
              <div className={`mt-0.5 text-[11px] ${pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{pnl >= 0 ? '+' : '−'}{money(pnl).replace('-', '')} P&amp;L</div>
            </button>
          )}
          {loans.length > 0 && (
            <button onClick={() => setView('loans')} className="rounded-xl border border-white/10 bg-white/[.035] p-3 text-left transition hover:bg-white/[.06]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Loans outstanding</span>
                <Briefcase size={14} className="text-amber-300" />
              </div>
              <div className="mt-1.5 text-lg font-semibold text-white">{showMoney ? money(totalOutstanding) : '••••'}</div>
              <div className="mt-0.5 text-[11px] text-slate-500">{loans.filter((l) => l.status !== 'closed').length} active loan{loans.filter((l) => l.status !== 'closed').length === 1 ? '' : 's'}</div>
            </button>
          )}
          {bucket_list.length > 0 && (
            <button onClick={() => setView('bucket')} className="rounded-xl border border-white/10 bg-white/[.035] p-3 text-left transition hover:bg-white/[.06]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Bucket list</span>
                <Mountain size={14} className="text-cyan-300" />
              </div>
              <div className="mt-1.5 text-lg font-semibold text-white">{bucket_list.length} dream{bucket_list.length === 1 ? '' : 's'}</div>
              <div className="mt-0.5 text-[11px] text-slate-500">{bucket_list.filter((b) => b.status === 'saving').length} being saved for</div>
            </button>
          )}
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex min-h-0 flex-col gap-3">
          <div className="shrink-0 rounded-2xl border border-white/10 bg-white/[.035] p-3.5">
            <div className="mb-1 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Cash flow · last 6 months</div>
                <div className="text-xs text-slate-500">Income vs expense</div>
              </div>
              <BarChart3 size={16} className="text-slate-500" />
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={months}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff11" />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip cursor={{ fill: '#ffffff08' }} contentStyle={{ background: '#0f1420', border: '1px solid #ffffff22', borderRadius: 12, color: '#fff' }} formatter={(v) => money(v)} />
                  <Legend iconType="circle" wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                  <Bar dataKey="income" fill="#34d399" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="expense" fill="#fb7185" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-white/[.035]">
            <div className="flex shrink-0 items-center justify-between px-3.5 py-2.5">
              <div>
                <div className="text-sm font-semibold text-white">Recent transactions</div>
                <div className="text-xs text-slate-500">{thisMonth?.label || 'This month'}'s activity</div>
              </div>
              <button onClick={() => setView('transactions')} className="text-xs text-cyan-300 hover:underline">See all</button>
            </div>
            {recent.length === 0 ? (
              <EmptyState compact icon={Wallet} title="No transactions yet" message="Log your first income or expense to see it here." cta="Add transaction" onCta={onOpenTxForm} />
            ) : (
              <TransactionTicker items={recent} categories={categories} accounts={accounts} creditCards={credit_cards} showMoney={showMoney} />
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-3">
          <div className="shrink-0">
            <MoneyRulesWidget rules={money_rules} onOpen={() => setView('rules')} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-white/[.035] p-3.5">
            <div className="mb-2 flex shrink-0 items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Balances</div>
                <div className="text-xs text-slate-500">Accounts, cards &amp; investments</div>
              </div>
              <button onClick={() => setView('accounts')} className="text-xs text-cyan-300 hover:underline">Manage</button>
            </div>
            {balanceItems.length === 0 ? (
              <EmptyState compact icon={Landmark} title="Nothing tracked yet" message="Add an account, card, or portfolio to see balances here." cta="Add account" onCta={() => setView('accounts')} />
            ) : (
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                {balanceItems.map((it) => (
                  <div key={it.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${it.color}22`, color: it.color }}>
                        <it.icon size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">{it.name}</div>
                        <div className="truncate text-[11px] capitalize text-slate-500">{it.sub}</div>
                      </div>
                    </div>
                    <div className={`shrink-0 text-sm font-semibold ${it.debt ? 'text-rose-300' : 'text-white'}`}>{showMoney ? `${it.debt ? '−' : ''}${money(it.amount).replace('-', '')}` : '••••'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
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
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#141a28]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-white"><Paperclip size={15} className="shrink-0 text-slate-500" /><span className="truncate">{name || 'Attachment'}</span></div>
          <div className="flex items-center gap-1">
            {url && <button type="button" onClick={download} disabled={downloading} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-50" title="Download"><Download size={16} /></button>}
            <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-black/30 p-4">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-500">Loading…</div>
          ) : !url ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-500">Couldn&apos;t load attachment.</div>
          ) : isImage ? (
            <img src={url} alt={name} className="mx-auto max-h-[70vh] rounded-xl object-contain" />
          ) : isPdf ? (
            <iframe src={url} title={name} className="h-[70vh] w-full rounded-xl bg-white" />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-sm text-slate-400">
              <FileText size={28} />
              <button type="button" onClick={download} disabled={downloading} className="rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-2 text-sm font-semibold text-[#07101c] disabled:opacity-60">{downloading ? 'Downloading…' : 'Download file'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TransactionsView({ data, onOpenTxForm, onEditTx, onDeleteTx, onImport, showMoney, onToggleMoney, onOpenRecurring, onPayCardBill }) {
  const { transactions, accounts, categories, credit_cards: creditCards = [] } = data
  const [query, setQuery] = useState('')
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
  const rangeRef = useRef(null)
  const settingsRef = useRef(null)
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
    if (sortBy === `${field}_asc`) return <ChevronUp size={12} className="text-cyan-300" />
    if (sortBy === `${field}_desc`) return <ChevronDown size={12} className="text-cyan-300" />
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
    link.download = 'deepak-finance-transactions.csv'
    link.click(); URL.revokeObjectURL(link.href)
  }

  const exportPdf = () => {
    const doc = new jsPDF()
    const rangeLabel = customRange ? `${formatDate(customRange.start)} - ${formatDate(customRange.end)}` : `${MONTH_NAMES[monthCursor.month]} ${monthCursor.year}`
    doc.setFontSize(14)
    doc.text('Deepak Finance - Transaction Statement', 14, 16)
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
    doc.save('deepak-finance-transactions.pdf')
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
          <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Money movement</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Every rupee, accounted for</h1>
        </div>
        <div className="flex gap-2">
          <div className={`flex items-center rounded-xl border ${customRange ? 'border-white/5 opacity-40' : 'border-white/10'}`}>
            <button type="button" disabled={!!customRange} onClick={() => shiftMonth(-1)} className="rounded-l-xl p-2.5 text-slate-400 hover:bg-white/5 hover:text-white disabled:pointer-events-none" title="Previous month"><ChevronLeft size={15} /></button>
            <span className="w-9 text-center text-xs font-semibold uppercase tracking-wider text-slate-300" title={`${MONTH_NAMES[monthCursor.month]} ${monthCursor.year}`}>{MONTH_NAMES[monthCursor.month].slice(0, 3)}</span>
            <button type="button" disabled={!!customRange} onClick={() => shiftMonth(1)} className="rounded-r-xl p-2.5 text-slate-400 hover:bg-white/5 hover:text-white disabled:pointer-events-none" title="Next month"><ChevronRight size={15} /></button>
          </div>
          <div ref={rangeRef} className="relative">
            <button type="button" onClick={() => { setRangeDraft(customRange || { start: '', end: '' }); setRangeOpen((o) => !o) }} className={`rounded-xl border p-2.5 transition ${customRange ? 'border-cyan-300/40 bg-cyan-400/10 text-cyan-200' : 'border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'}`} title="Custom date range">
              <Calendar size={16} />
            </button>
            {rangeOpen && (
              <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-white/10 bg-[#141a28] p-4 shadow-2xl">
                <div className="mb-3 text-xs uppercase tracking-widest text-slate-500">Custom range</div>
                <label className="mb-3 block text-sm text-slate-300">Start date
                  <DateInput value={rangeDraft.start} onChange={(e) => setRangeDraft((d) => ({ ...d, start: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-2.5 text-white outline-none focus:border-cyan-300/50" />
                </label>
                <label className="mb-4 block text-sm text-slate-300">End date
                  <DateInput value={rangeDraft.end} onChange={(e) => setRangeDraft((d) => ({ ...d, end: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-2.5 text-white outline-none focus:border-cyan-300/50" />
                </label>
                <div className="flex gap-2">
                  {customRange && (
                    <button type="button" onClick={() => { setCustomRange(null); setRangeDraft({ start: '', end: '' }); setRangeOpen(false) }} className="flex-1 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5">Clear</button>
                  )}
                  <button type="button" disabled={!rangeDraft.start || !rangeDraft.end || rangeDraft.start > rangeDraft.end} onClick={() => { setCustomRange({ start: rangeDraft.start, end: rangeDraft.end }); setRangeOpen(false) }} className="flex-1 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-3 py-2.5 text-sm font-semibold text-[#07101c] disabled:opacity-50">Apply</button>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center overflow-hidden rounded-xl border border-white/10">
            <button type="button" onClick={() => setChartView(false)} title="Table view" className={`flex items-center px-3 py-2.5 transition ${!chartView ? 'bg-cyan-400/15 text-cyan-200' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><ListChecks size={16} /></button>
            <div className="h-5 w-px shrink-0 bg-white/10" />
            <button type="button" onClick={() => setChartView(true)} title="Chart view" className={`flex items-center px-3 py-2.5 transition ${chartView ? 'bg-cyan-400/15 text-cyan-200' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><PieChartIcon size={16} /></button>
          </div>
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-slate-600" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search transactions" className="w-full rounded-xl border border-white/10 bg-white/[.04] py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-cyan-300/50" />
        </div>
        <Select value={type} onChange={(e) => setType(e.target.value)} className="rounded-xl border border-white/10 bg-[#101621] px-4 py-2.5 text-sm text-slate-300 outline-none">
          <option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option><option value="transfer">Transfer</option>
        </Select>
        <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="rounded-xl border border-white/10 bg-[#101621] px-4 py-2.5 text-sm text-slate-300 outline-none">
          <option value="all">All accounts</option>
          {accounts.filter((a) => a.type !== 'debit_card').map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          {creditCards.map((c) => <option key={c.id} value={`cc:${c.id}`}>{c.name} (card)</option>)}
        </Select>
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="rounded-xl border border-white/10 bg-[#101621] px-4 py-2.5 text-sm text-slate-300 outline-none">
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <div ref={settingsRef} className="relative">
          <button type="button" onClick={() => setSettingsOpen((o) => !o)} className={`rounded-xl border p-2.5 transition ${settingsOpen ? 'border-cyan-300/40 bg-cyan-400/10 text-cyan-200' : 'border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'}`} title="More options">
            <MoreVertical size={16} />
          </button>
          {settingsOpen && (
            <div className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-white/10 bg-[#141a28] p-1 shadow-2xl">
              <button type="button" onClick={() => { setSettingsOpen(false); onImport() }} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5">Import CSV</button>
              <button type="button" disabled={exportBusy} onClick={() => handleExport('csv')} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50">Export as CSV</button>
              <button type="button" disabled={exportBusy} onClick={() => handleExport('pdf')} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50">Export as PDF</button>
              <div className="my-1 border-t border-white/10" />
              <button type="button" onClick={() => { setSettingsOpen(false); onOpenRecurring() }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5"><Repeat size={14} />Recurring transactions</button>
            </div>
          )}
        </div>
      </div>

      {chartView ? (
        categoryBreakdown.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[.035]">
            <EmptyState icon={Tag} title="No category data" message="Nothing categorised in the current filters yet." />
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[.035] p-6">
            <div className="mb-5 text-sm font-semibold text-white">By category · {customRange ? `${formatDate(customRange.start)} – ${formatDate(customRange.end)}` : `${MONTH_NAMES[monthCursor.month]} ${monthCursor.year}`}</div>
            <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
              <div className="h-[28rem]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryBreakdown} dataKey="value" nameKey="name" innerRadius={90} outerRadius={170} stroke="none">
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
                      <div className="truncate text-slate-300">{c.name}</div>
                    </div>
                    <div className="shrink-0 font-medium text-white">{showMoney ? money(c.value) : '••••'}</div>
                  </div>
                ))}
                <div className="mt-1 border-t border-white/20" />
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="font-semibold text-white">Total</div>
                  <div className="font-semibold text-white">{showMoney ? money(categoryBreakdown.reduce((s, c) => s + c.value, 0)) : '••••'}</div>
                </div>
                <div className="border-t border-white/20" />
              </div>
            </div>
          </div>
        )
      ) : (
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.035]">
        <div className="hidden grid-cols-[1.4fr_.9fr_.6fr_.6fr_auto] gap-4 border-b border-white/10 px-5 py-3 text-[10px] uppercase tracking-widest text-slate-600 sm:grid">
          <button type="button" onClick={() => toggleSort('description')} className="flex items-center gap-1 text-left hover:text-slate-300">Description{sortIcon('description')}</button>
          <span>Category / Account</span>
          <button type="button" onClick={() => toggleSort('date')} className="flex items-center gap-1 text-left hover:text-slate-300">Date{sortIcon('date')}</button>
          <button type="button" onClick={() => toggleSort('amount')} className="flex items-center justify-end gap-1 text-right hover:text-slate-300">Amount{sortIcon('amount')}</button>
          <span />
        </div>
        {sorted.length === 0 ? (
          <EmptyState icon={Wallet} title="No transactions match" message="Try adjusting filters, or add your first entry." cta="Add transaction" onCta={onOpenTxForm} />
        ) : (
          <div className="divide-y divide-white/5">
            {pageRows.map((t) => {
              const cat = categories.find((c) => c.id === t.category_id)
              const acc = resolveSource(t)
              const isIn = t.type === 'income' || (t.type === 'transfer' && t.transfer_direction === 'in')
              const isTransfer = t.type === 'transfer'
              const sign = isIn ? '+' : '-'
              const color = isIn ? 'text-emerald-300' : isTransfer ? 'text-cyan-300' : 'text-rose-300'
              return (
                <div key={t.id} className="grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-[1.4fr_.9fr_.6fr_.6fr_auto] sm:items-center sm:gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.05]" style={{ color: cat?.color || (isTransfer ? '#22d3ee' : '#94a3b8') }}>
                      {isTransfer ? <ArrowLeftRight size={16} /> : isIn ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-sm font-medium text-white">
                        {t.description}
                        {t.attachment_path && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); setViewingAttachment(t) }} className="shrink-0 text-slate-500 hover:text-cyan-300" title="View attachment"><Paperclip size={12} /></button>
                        )}
                        {t.recurring_source_id && <Repeat size={12} className="shrink-0 text-slate-500" title="Auto-generated from a recurring rule" />}
                      </div>
                      {t.notes && <div className="text-[11px] text-slate-500">{t.notes}</div>}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    <span className="inline-block rounded-md bg-white/[.05] px-2 py-0.5" style={{ color: cat?.color || '#94a3b8' }}>{cat?.name || (isTransfer ? (t.transfer_direction === 'in' ? 'Transfer in' : 'Transfer out') : 'Uncategorised')}</span>
                    {acc && <span className="ml-2">{acc.name}</span>}
                  </div>
                  <div className="text-xs text-slate-500">{formatDateTime(t.date, t.time)}</div>
                  <div className={`text-sm font-semibold sm:text-right ${color}`}>{showMoney ? `${sign}${money(t.amount).replace('-', '')}` : '••••'}</div>
                  <div className="flex gap-1 sm:justify-end">
                    <button onClick={() => onEditTx(t)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={14} /></button>
                    <button onClick={() => onDeleteTx(t)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={14} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-xs text-slate-400">
            <span>Page {page + 1} of {totalPages} · {sorted.length} transactions</span>
            <div className="flex gap-2">
              <button type="button" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="rounded-lg border border-white/10 px-3 py-1.5 hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none">Previous</button>
              <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} className="rounded-lg border border-white/10 px-3 py-1.5 hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none">Next</button>
            </div>
          </div>
        )}
      </section>
      )}
      <AttachmentViewer open={!!viewingAttachment} onClose={() => setViewingAttachment(null)} transaction={viewingAttachment} />
    </div>
  )
}

function InsightsView({ data }) {
  const { transactions, categories } = data
  const now = new Date()
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`
  const monthTx = transactions.filter((t) => {
    const d = new Date(t.date); return `${d.getFullYear()}-${d.getMonth()}` === monthKey && t.type !== 'transfer'
  })
  const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0)
  const expense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0)
  const savings = income - expense
  const rate = income > 0 ? Math.round((savings / income) * 100) : 0

  // Top expense categories
  const byCat = {}
  monthTx.filter((t) => t.type === 'expense').forEach((t) => {
    const key = t.category_id || 'uncat'
    byCat[key] = (byCat[key] || 0) + Number(t.amount || 0)
  })
  const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, value]) => {
    const cat = categories.find((c) => c.id === id)
    return { name: cat?.name || 'Uncategorised', value, color: cat?.color || '#64748b' }
  })

  const insights = []
  if (income > 0) {
    if (rate >= 30) insights.push({ tone: 'good', text: `Impressive! You're saving ${rate}% of your income this month — well above the 20% benchmark.` })
    else if (rate >= 20) insights.push({ tone: 'good', text: `Solid month — you're saving ${rate}% of your income.` })
    else if (rate >= 0) insights.push({ tone: 'warn', text: `Only ${rate}% saved so far this month. Try to trim one variable expense category.` })
    else insights.push({ tone: 'warn', text: `You've spent more than you earned this month. Review your top category below.` })
  }
  if (topCats[0]) insights.push({ tone: 'info', text: `Biggest expense category: ${topCats[0].name} at ${money(topCats[0].value)}.` })
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysPassed = now.getDate()
  if (expense > 0) insights.push({ tone: 'info', text: `Daily burn: ${money(Math.round(expense / daysPassed))} · projected month ${money(Math.round((expense / daysPassed) * daysInMonth))}.` })

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Smart spending</div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Insights · {now.toLocaleString('en-IN', { month: 'long' })}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Income this month" value={money(income)} icon={TrendingUp} accent="bg-emerald-400/15 text-emerald-200" sub={<span>{monthTx.filter(t => t.type === 'income').length} entries</span>} />
        <StatCard label="Expenses this month" value={money(expense)} icon={TrendingDown} accent="bg-rose-400/15 text-rose-200" tone="text-rose-300" sub={<span className="text-rose-300">{monthTx.filter(t => t.type === 'expense').length} entries</span>} />
        <StatCard label="Savings" value={money(savings)} icon={PiggyBank} accent="bg-cyan-300/15 text-cyan-200" sub={<span className={rate >= 20 ? 'text-emerald-300' : 'text-amber-300'}>{rate}% of income</span>} tone={rate >= 20 ? 'text-emerald-300' : 'text-amber-300'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
          <div className="mb-4 text-sm font-semibold text-white">Where money goes</div>
          {topCats.length === 0 ? (
            <EmptyState icon={Tag} title="No expense data" message="Log a few expenses to see your top categories." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={topCats} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} stroke="none">
                    {topCats.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0f1420', border: '1px solid #ffffff22', borderRadius: 12, color: '#fff' }} formatter={(v) => money(v)} />
                  <Legend iconType="circle" wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
          <div className="mb-4 text-sm font-semibold text-white">Smart insights</div>
          {insights.length === 0 ? (
            <EmptyState icon={Sparkles} title="Nothing to analyse yet" message="Log a few transactions this month and we'll surface patterns." />
          ) : (
            <div className="space-y-3">
              {insights.map((ins, i) => (
                <div key={i} className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${ins.tone === 'good' ? 'border-emerald-400/25 bg-emerald-500/5 text-emerald-100' : ins.tone === 'warn' ? 'border-amber-400/25 bg-amber-500/5 text-amber-100' : 'border-cyan-400/20 bg-cyan-400/5 text-cyan-100'}`}>
                  <Sparkles size={16} className="mt-0.5 flex-shrink-0" />
                  <div>{ins.text}</div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 space-y-2">
            <div className="text-xs uppercase tracking-widest text-slate-500">Top categories</div>
            {topCats.length === 0 ? <div className="text-sm text-slate-500">No expense categories yet.</div> : topCats.map((c) => {
              const pct = expense > 0 ? Math.round((c.value / expense) * 100) : 0
              return (
                <div key={c.name}>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{c.name}</span><span className="text-white">{money(c.value)} · {pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Shell (nav + main) ---------------- */
function Shell({ user, onLogout }) {
  const [view, setView] = useState('dashboard')
  const [showMoney, setShowMoney] = useState(true)
  const [data, setData] = useState({ accounts: [], categories: [], transactions: [], budgets: [], portfolios: [], holdings: [], sips: [], other_investments: [], kite_orders: [], loans: [], loan_payments: [], bucket_list: [], lend_borrow: [], lend_repayments: [], credit_cards: [], credit_card_transactions: [], scholarships: [], scholarship_payments: [], money_rules: [], recurring_transactions: [], money_profiles: [], money_profile_entries: [], profile: null })
  const [loading, setLoading] = useState(true)

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
  const [budgetFormOpen, setBudgetFormOpen] = useState(false)
  const [budgetEditing, setBudgetEditing] = useState(null)
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
  const [fundsFormOpen, setFundsFormOpen] = useState(false)
  const [fundsPortfolio, setFundsPortfolio] = useState(null)
  const [withdrawFormOpen, setWithdrawFormOpen] = useState(false)
  const [withdrawPortfolio, setWithdrawPortfolio] = useState(null)
  const [sipFormOpen, setSipFormOpen] = useState(false)
  const [sipEditing, setSipEditing] = useState(null)
  const [theme, setTheme] = useState('dark')
  const [cardFormOpen, setCardFormOpen] = useState(false)
  const [cardEditing, setCardEditing] = useState(null)
  const [cardSpendOpen, setCardSpendOpen] = useState(false)
  const [cardSpendTarget, setCardSpendTarget] = useState(null)
  const [cardPayOpen, setCardPayOpen] = useState(false)
  const [cardPayTarget, setCardPayTarget] = useState(null)
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

  const refresh = async () => {
    try {
      const response = await fetch('/api/finance/summary')
      if (!response.ok) throw new Error('Failed to load')
      const result = await response.json()
      setData({
        accounts: result.accounts || [], categories: result.categories || [], transactions: result.transactions || [], budgets: result.budgets || [],
        portfolios: result.portfolios || [], holdings: result.holdings || [], sips: result.sips || [], other_investments: result.other_investments || [], kite_orders: result.kite_orders || [],
        loans: result.loans || [], loan_payments: result.loan_payments || [], bucket_list: result.bucket_list || [],
        lend_borrow: result.lend_borrow || [], lend_repayments: result.lend_repayments || [],
        credit_cards: result.credit_cards || [], credit_card_transactions: result.credit_card_transactions || [],
        scholarships: result.scholarships || [], scholarship_payments: result.scholarship_payments || [],
        money_rules: result.money_rules || [],
        recurring_transactions: result.recurring_transactions || [],
        money_profiles: result.money_profiles || [], money_profile_entries: result.money_profile_entries || [],
        profile: result.profile || null,
      })
    } catch (e) {
      toast.push(e.message || 'Could not load data', 'error')
    } finally { setLoading(false) }
  }
  useEffect(() => { refresh() }, [])

  const openTxForm = (t = null, defaultAccountId = '', defaultRepayment = null) => { setTxEditing(t); setTxDefaultAccountId(defaultAccountId); setTxDefaultRepayment(defaultRepayment); setTxFormOpen(true) }
  const closeTxForm = () => { setTxFormOpen(false); setTxEditing(null); setTxDefaultAccountId(''); setTxDefaultRepayment(null) }
  const onTxSaved = async () => { closeTxForm(); await refresh() }

  const openAccForm = (a = null) => { setAccEditing(a); setAccFormOpen(true) }
  const closeAccForm = () => { setAccFormOpen(false); setAccEditing(null) }
  const onAccSaved = async () => { closeAccForm(); await refresh() }

  const openCatForm = (c = null) => { setCatEditing(c); setCatFormOpen(true) }
  const closeCatForm = () => { setCatFormOpen(false); setCatEditing(null) }
  const onCatSaved = async () => { closeCatForm(); await refresh() }

  const openBudgetForm = (b = null) => { setBudgetEditing(b); setBudgetFormOpen(true) }
  const closeBudgetForm = () => { setBudgetFormOpen(false); setBudgetEditing(null) }
  const onBudgetSaved = async () => { closeBudgetForm(); await refresh() }

  const deleteBudget = async (b) => {
    if (!(await confirm.ask('Delete this budget?'))) return
    const response = await fetch(`/api/finance/budgets/${b.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Budget deleted'); await refresh() } else { toast.push('Delete failed', 'error') }
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
    const response = await fetch(`/api/finance/portfolios/${p.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Portfolio deleted'); await refresh() } else { toast.push('Delete failed', 'error') }
  }
  const deleteHolding = async (h) => {
    if (!(await confirm.ask(`Remove ${h.symbol}?`))) return
    const response = await fetch(`/api/finance/holdings/${h.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Holding removed'); await refresh() } else { toast.push('Delete failed', 'error') }
  }
  const openOtherInvestmentForm = (portfolioId) => { setOtherInvestmentEditing(null); setOtherInvestmentPortfolioId(portfolioId); setOtherInvestmentFormOpen(true) }
  const openOtherInvestmentEdit = (o) => { setOtherInvestmentEditing(o); setOtherInvestmentPortfolioId(o.portfolio_id); setOtherInvestmentFormOpen(true) }
  const closeOtherInvestmentForm = () => { setOtherInvestmentFormOpen(false); setOtherInvestmentEditing(null) }
  const onOtherInvestmentSaved = async () => { closeOtherInvestmentForm(); await refresh() }
  const deleteOtherInvestment = async (o) => {
    if (!(await confirm.ask(`Remove "${o.name}"?`))) return
    const response = await fetch(`/api/finance/other_investments/${o.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Investment removed'); await refresh() } else { toast.push('Delete failed', 'error') }
  }
  // Manual override — the price you type in directly, distinct from a live fetch below.
  const onManualPriceEntry = async (h) => {
    const price = await prompt.ask(`Update current price for ${h.symbol}`, { defaultValue: h.current_price || h.avg_buy_price, inputType: 'number', confirmLabel: 'Update' })
    if (!price || !Number.isFinite(Number(price))) return
    const response = await fetch(`/api/finance/holdings/${h.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current_price: Number(price), last_price_updated_at: new Date().toISOString() }) })
    if (response.ok) { toast.push(`${h.symbol} updated`); await refresh() } else { toast.push('Update failed', 'error') }
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
    const response = await fetch(`/api/finance/loans/${l.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Loan deleted'); await refresh() } else { toast.push('Delete failed', 'error') }
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
    const response = await fetch(`/api/finance/bucket_list/${b.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Removed'); await refresh() } else { toast.push('Delete failed', 'error') }
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
    const response = await fetch(`/api/finance/sips/${s.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('SIP deleted'); await refresh() } else { toast.push('Delete failed', 'error') }
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
  useEffect(() => { if (data.profile?.theme) setTheme(data.profile.theme) }, [data.profile])
  // Scholarships is opt-in — if it gets turned off while that view is open (or data just loaded
  // with it already off), fall back to the dashboard instead of showing a nav-less dead view.
  useEffect(() => { if (view === 'scholarships' && data.profile && !data.profile.scholarships_enabled) setView('dashboard') }, [view, data.profile])
  const onThemeChange = async (t) => { setTheme(t); await fetch('/api/finance/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: t }) }); toast.push(`Theme: ${t}`, 'info') }

  // Credit cards
  const openCardForm = (c = null) => { setCardEditing(c); setCardFormOpen(true) }
  const closeCardForm = () => { setCardFormOpen(false); setCardEditing(null) }
  const onCardSaved = async () => { closeCardForm(); await refresh() }
  const deleteCard = async (c) => {
    if (!(await confirm.ask(`Delete card "${c.name}"? All linked spends will be removed.`))) return
    const response = await fetch(`/api/finance/credit_cards/${c.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Card deleted'); await refresh() } else { toast.push('Delete failed', 'error') }
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
    const response = await fetch(`/api/finance/money_profiles/${p.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Profile deleted'); await refresh() } else { toast.push('Delete failed', 'error') }
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
    const response = await fetch(`/api/finance/money_profiles/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus }) })
    if (response.ok) { toast.push(nextStatus === 'closed' ? 'Profile closed' : 'Profile reactivated'); await refresh() } else { toast.push('Update failed', 'error') }
  }
  const updateMoneyProfileCategories = async (p, categories) => {
    const response = await fetch(`/api/finance/money_profiles/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categories }) })
    if (response.ok) await refresh(); else toast.push('Update failed', 'error')
  }

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
    const response = await fetch(`/api/finance/transactions/${t.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Transaction deleted'); await refresh() } else { toast.push('Delete failed', 'error') }
  }
  const deleteAccount = async (a) => {
    if (!(await confirm.ask(`Delete "${a.name}"? Its transactions stay but lose the account link.`))) return
    const response = await fetch(`/api/finance/accounts/${a.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Account deleted'); await refresh() } else { toast.push('Delete failed', 'error') }
  }
  const deleteCategory = async (c) => {
    if (!(await confirm.ask(`Delete category "${c.name}"?`))) return
    const response = await fetch(`/api/finance/categories/${c.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Category deleted'); await refresh() } else { toast.push('Delete failed', 'error') }
  }

  const firstName = data.profile?.full_name?.split(' ')?.[0] || user?.user_metadata?.full_name?.split(' ')?.[0] || user?.email?.split('@')?.[0] || 'Deepak'

  const nav = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'transactions', label: 'Transactions', icon: BarChart3 },
    { key: 'accounts', label: 'Accounts', icon: Landmark },
    { key: 'cards', label: 'Credit cards', icon: CreditCard },
    { key: 'investments', label: 'Investments', icon: TrendingUp },
    { key: 'loans', label: 'Loans', icon: Briefcase },
    { key: 'family_company', label: 'Family / Company', icon: Users },
    { key: 'lend', label: 'Lend / Borrow', icon: Heart },
    ...(data.profile?.scholarships_enabled ? [{ key: 'scholarships', label: 'Scholarships', icon: ShieldCheck }] : []),
    { key: 'budgets', label: 'Budgets', icon: Target },
    { key: 'bucket', label: 'Bucket list', icon: Mountain },
    { key: 'rules', label: 'Money rules', icon: Star },
    { key: 'insights', label: 'Insights', icon: LineChart },
  ]
  const avatarUrl = data.profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''
  const fitScreen = view === 'dashboard' || view === 'profile'
  const bottomNav = [
    { key: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { key: 'transactions', label: 'Ledger', icon: BarChart3 },
    { key: 'investments', label: 'Invest', icon: TrendingUp },
    { key: 'profile', label: 'You', icon: Sparkles },
  ]

  return (
    <div className="min-h-screen bg-[#080b12] text-slate-100">
      {toast.view}
      {confirm.view}
      {prompt.view}
      <div className="mx-auto flex min-h-screen max-w-[1480px]">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-white/5 px-5 py-6 lg:flex lg:sticky lg:top-0 lg:h-screen lg:self-start lg:overflow-y-auto">
          <div className="flex items-center gap-3 text-sm font-semibold text-white">
            <img src="/logo.png" alt="" className="h-10 w-10 rounded-2xl object-cover" />Personal Finance
          </div>
          <nav className="mt-10 space-y-1">
            {nav.map((n) => (
              <button key={n.key} onClick={() => setView(n.key)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${view === n.key ? 'bg-white/[.06] text-white' : 'text-slate-400 hover:bg-white/[.04] hover:text-white'}`}>
                <n.icon size={17} />{n.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto flex w-full items-center gap-1 rounded-2xl border border-white/10 bg-white/[.035] p-2.5">
            <button onClick={() => setView('profile')} className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1.5 py-1 text-left transition hover:bg-white/[.06] ${view === 'profile' ? 'bg-white/[.06]' : ''}`}>
              <Avatar src={avatarUrl} name={firstName} email={user?.email} size={36} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-white">{firstName}</div>
                <div className="truncate text-[11px] text-slate-500">{user?.email}</div>
              </div>
            </button>
            <button onClick={onLogout} title="Sign out" className="shrink-0 rounded-lg border border-transparent p-2 text-slate-500 transition hover:border-white/10 hover:bg-white/5 hover:text-white"><LogOut size={15} /></button>
          </div>
        </aside>

        {/* Main */}
        <main className={`flex-1 px-5 pb-24 pt-6 lg:px-10 lg:pb-10 ${fitScreen ? 'flex flex-col lg:h-screen' : ''}`}>
          {view === 'dashboard' && (
            <header className={`flex shrink-0 items-center justify-between ${fitScreen ? 'mb-3' : 'mb-8'}`}>
              <div>
                <div className="text-xs uppercase tracking-widest text-slate-500">Welcome back</div>
                <div className="mt-1 text-xl font-semibold text-white">Hi, {firstName} 👋</div>
              </div>
              <button onClick={() => setShowMoney((v) => !v)} className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
                {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </header>
          )}

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
              <Skeleton className="col-span-full h-72" />
            </div>
          ) : (
            <div className={fitScreen ? 'min-h-0 flex-1 lg:overflow-y-auto' : ''}>
              {view === 'dashboard' && <DashboardView data={data} showMoney={showMoney} onOpenTxForm={() => openTxForm()} setView={setView} onPayCardBill={openCardPay} />}
              {view === 'transactions' && <TransactionsView data={data} onOpenTxForm={() => openTxForm()} onEditTx={openTxForm} onDeleteTx={deleteTx} onImport={() => setCsvOpen(true)} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onOpenRecurring={openRecurringManager} onPayCardBill={openCardPay} />}
              {view === 'accounts' && <AccountsView data={data} onAdd={() => openAccForm()} onEdit={openAccForm} onDelete={deleteAccount} onDeleteTx={deleteTx} onAddTransaction={(accountId) => openTxForm(null, accountId)} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} />}
              {view === 'categories' && <CategoriesView data={data} onAdd={() => openCatForm()} onEdit={openCatForm} onDelete={deleteCategory} />}
              {view === 'budgets' && <BudgetsView data={data} onAdd={() => openBudgetForm()} onEdit={openBudgetForm} onDelete={deleteBudget} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} />}
              {view === 'investments' && <InvestmentsView data={data} onAddPortfolio={() => openPortfolioForm()} onEditPortfolio={openPortfolioForm} onDeletePortfolio={deletePortfolio} onAddHolding={openHoldingForm} onBulkImport={openBulkImport} onEditHolding={openHoldingEdit} onDeleteHolding={deleteHolding} onRefreshRowPrice={onRefreshRowPrice} onManualPriceEntry={onManualPriceEntry} onRefreshAll={refreshAllPrices} pricesLoading={pricesLoading} onAddFunds={openFundsForm} onWithdrawFunds={openWithdrawForm} onConnectKite={connectKite} onLinkKite={linkPortfolioKite} onUnlinkKite={unlinkPortfolioKite} onSyncKite={syncPortfolioKite} kiteSyncBusy={kiteSyncBusy} onAddSip={openSipForm} onEditSip={openSipForm} onDeleteSip={deleteSip} onSyncSipsKite={syncSipsKite} onAddOtherInvestment={openOtherInvestmentForm} onEditOtherInvestment={openOtherInvestmentEdit} onDeleteOtherInvestment={deleteOtherInvestment} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} />}
              {view === 'cards' && <CreditCardsView data={data} onAdd={() => openCardForm()} onEdit={openCardForm} onDelete={deleteCard} onSpend={openCardSpend} onPay={openCardPay} onDeleteSpend={deleteCardSpend} onDeleteTx={deleteTx} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} />}
              {view === 'scholarships' && <ScholarshipsView data={data} onAdd={() => openScholarshipForm()} onEdit={openScholarshipForm} onDelete={deleteScholarship} onPay={openScholarshipPay} onRefresh={refresh} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} toast={toast} />}
              {view === 'rules' && <MoneyRulesView data={data} onAdd={addRule} onToggle={toggleRule} onEdit={() => {}} onDelete={deleteRule} />}
              {view === 'loans' && <LoansView data={data} onAdd={() => openLoanForm()} onEdit={openLoanForm} onDelete={deleteLoan} onPay={openLoanPay} onDeletePayment={deleteLoanPayment} onSync={syncLoanOutstanding} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} />}
              {view === 'lend' && <LendBorrowView data={data} onAdd={() => openLendForm()} onEdit={openLendForm} onDelete={deleteLend} onDeleteTx={deleteTx} onLogRepayment={(record) => openTxForm(null, '', { value: `lend:${record.id}`, type: record.type === 'lent' ? 'income' : 'expense' })} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} />}
              {view === 'family_company' && <FamilyCompanyView data={data} onAddProfile={() => openMoneyProfileForm()} onEditProfile={openMoneyProfileForm} onDeleteProfile={deleteMoneyProfile} onAddEntry={openMoneyProfileEntryForm} onEditEntry={openMoneyProfileEntryEdit} onDeleteEntry={deleteMoneyProfileEntry} onBulkImport={openMoneyProfileBulkImport} onToggleStatus={toggleMoneyProfileStatus} />}
              {view === 'bucket' && <BucketListView data={data} onAdd={() => openBucketForm()} onEdit={openBucketForm} onDelete={deleteBucket} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} />}
              {view === 'insights' && <InsightsView data={data} />}
              {view === 'profile' && <ProfileView data={data} user={user} theme={theme} onThemeChange={onThemeChange} onSaveProfile={onSaveProfile} onAddCategory={() => openCatForm()} onEditCategory={openCatForm} onDeleteCategory={deleteCategory} onLogout={onLogout} />}
            </div>
          )}
        </main>
      </div>

      {/* Floating quick add */}
      <button onClick={() => openTxForm()} className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 text-[#07101c] shadow-2xl shadow-cyan-500/30 transition hover:scale-105 lg:bottom-8 lg:right-8" title="Quick add transaction">
        <Plus size={24} />
      </button>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-[#0b0f18]/95 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {bottomNav.map((n) => (
            <button key={n.key} onClick={() => setView(n.key)} className={`flex flex-col items-center gap-1 py-3 text-[11px] ${view === n.key ? 'text-cyan-300' : 'text-slate-500'}`}>
              <n.icon size={18} />{n.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Modals */}
      <TransactionForm open={txFormOpen} onClose={closeTxForm} onSaved={onTxSaved} editing={txEditing} accounts={data.accounts} categories={data.categories} creditCards={data.credit_cards} lendBorrow={data.lend_borrow} loans={data.loans} onAddAccount={() => { closeTxForm(); openAccForm() }} onAddCategory={() => openCatForm()} toast={toast} profile={data.profile} defaultAccountId={txDefaultAccountId} defaultRepayment={txDefaultRepayment} />
      <AccountForm open={accFormOpen} onClose={closeAccForm} onSaved={onAccSaved} editing={accEditing} accounts={data.accounts} toast={toast} />
      <CategoryForm open={catFormOpen} onClose={closeCatForm} onSaved={onCatSaved} editing={catEditing} toast={toast} />
      <RecurringManager open={recurringManagerOpen} onClose={closeRecurringManager} rules={data.recurring_transactions} onAdd={() => openRecurringForm()} onEdit={openRecurringForm} onToggle={toggleRecurring} onDelete={deleteRecurring} showMoney={showMoney} />
      <RecurringForm open={recurringFormOpen} onClose={closeRecurringForm} onSaved={onRecurringSaved} editing={recurringEditing} accounts={data.accounts} categories={data.categories} toast={toast} />
      <BudgetForm open={budgetFormOpen} onClose={closeBudgetForm} onSaved={onBudgetSaved} editing={budgetEditing} categories={data.categories} toast={toast} />
      <CsvImport open={csvOpen} onClose={() => setCsvOpen(false)} onImported={async () => { setCsvOpen(false); await refresh() }} accounts={data.accounts} categories={data.categories} transactions={data.transactions} toast={toast} />
      <PortfolioForm open={portfolioFormOpen} onClose={closePortfolioForm} onSaved={onPortfolioSaved} editing={portfolioEditing} accounts={data.accounts} toast={toast} />
      <HoldingForm open={holdingFormOpen} onClose={closeHoldingForm} onSaved={onHoldingSaved} editing={holdingEditing} portfolios={data.portfolios} defaultPortfolioId={holdingDefaultPortfolio} profile={data.profile} toast={toast} />
      <OtherInvestmentForm open={otherInvestmentFormOpen} onClose={closeOtherInvestmentForm} onSaved={onOtherInvestmentSaved} editing={otherInvestmentEditing} portfolioId={otherInvestmentPortfolioId} toast={toast} />
      <HoldingsBulkImport open={bulkImportOpen} onClose={closeBulkImport} onImported={onBulkImported} portfolio={bulkImportPortfolio} toast={toast} />
      <LoanForm open={loanFormOpen} onClose={closeLoanForm} onSaved={onLoanSaved} editing={loanEditing} accounts={data.accounts} toast={toast} />
      <LoanPaymentForm open={loanPayOpen} onClose={closeLoanPay} onSaved={onLoanPaid} loan={loanPayLoan} accounts={data.accounts} creditCards={data.credit_cards} toast={toast} />
      <BucketForm open={bucketFormOpen} onClose={closeBucketForm} onSaved={onBucketSaved} editing={bucketEditing} toast={toast} />
      <LendForm open={lendFormOpen} onClose={closeLendForm} onSaved={onLendSaved} editing={lendEditing} accounts={data.accounts} creditCards={data.credit_cards} toast={toast} />
      <PortfolioFundsForm open={fundsFormOpen} onClose={closeFundsForm} onSaved={onFundsSaved} portfolio={fundsPortfolio} accounts={data.accounts} toast={toast} />
      <WithdrawFundsForm open={withdrawFormOpen} onClose={closeWithdrawForm} onSaved={onWithdrawSaved} portfolio={withdrawPortfolio} accounts={data.accounts} toast={toast} />
      <SipForm open={sipFormOpen} onClose={closeSipForm} onSaved={onSipSaved} editing={sipEditing} portfolios={data.portfolios} toast={toast} />
      <CreditCardForm open={cardFormOpen} onClose={closeCardForm} onSaved={onCardSaved} editing={cardEditing} toast={toast} />
      <CardSpendForm open={cardSpendOpen} onClose={closeCardSpend} onSaved={onCardSpendSaved} card={cardSpendTarget} categories={data.categories} toast={toast} />
      <CardPayForm open={cardPayOpen} onClose={closeCardPay} onSaved={onCardPaid} card={cardPayTarget} accounts={data.accounts} toast={toast} />
      <ScholarshipForm open={scholarshipFormOpen} onClose={closeScholarshipForm} onSaved={onScholarshipSaved} editing={scholarshipEditing} accounts={data.accounts} toast={toast} />
      <ScholarshipPayForm open={scholarshipPayOpen} onClose={closeScholarshipPay} onSaved={onScholarshipPaid} scholarship={scholarshipPayTarget} accounts={data.accounts} toast={toast} />
      <MoneyProfileForm open={moneyProfileFormOpen} onClose={closeMoneyProfileForm} onSaved={onMoneyProfileSaved} editing={moneyProfileEditing} accounts={data.accounts} toast={toast} />
      <MoneyProfileEntryForm open={moneyProfileEntryFormOpen} onClose={closeMoneyProfileEntryForm} onSaved={onMoneyProfileEntrySaved} editing={moneyProfileEntryEditing} profile={data.money_profiles?.find((p) => p.id === moneyProfileEntryProfileId)} onUpdateCategories={updateMoneyProfileCategories} toast={toast} />
      <MoneyProfileBulkImport open={moneyProfileBulkImportOpen} onClose={closeMoneyProfileBulkImport} onImported={onMoneyProfileBulkImported} profile={moneyProfileBulkImportProfile} toast={toast} />
    </div>
  )
}

/* ---------------- Root ---------------- */
function App() {
  const [user, setUser] = useState(undefined)
  const [authError, setAuthError] = useState('')
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const err = params.get('auth_error')
    if (err) setAuthError(err)
    if (err || params.has('code') || params.has('state')) {
      params.delete('auth_error'); params.delete('code'); params.delete('state')
      const qs = params.toString()
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''))
    }
    fetch('/api/auth/me').then((r) => r.ok ? r.json() : { user: null }).then((d) => setUser(d.user)).catch(() => setUser(null))
  }, [])
  if (user === undefined) return <LoadingScreen />
  if (!user) return <AuthScreen onAuth={setUser} initialError={authError} />
  return <Shell user={user} onLogout={async () => { await fetch('/api/auth/logout', { method: 'POST' }); setUser(null) }} />
}

export default App
