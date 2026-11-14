import { useEffect, useMemo, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import {
  ArrowDownRight, ArrowUpRight, CheckCircle2, ChevronDown, ChevronLeft, Clock, Eye, EyeOff,
  Landmark, MoreVertical, Pencil, RefreshCw, Sparkles, Target, Trash2, X,
} from 'lucide-react-native'
import { Icon } from '../ui/Icon'
import { AccentGradient } from '../ui/Gradient'
import { StatCard } from '../ui/StatCard'
import { HeroStatTile } from '../ui/HeroStatTile'
import { EmptyState } from '../ui/EmptyState'
import { DismissibleBanner } from '../ui/DismissibleBanner'
import { tw } from '../lib/tw'
import { dateToLocalISO, formatDate, money, todayISO } from '../lib/format'
import { liveOutstanding, monthAbbr, nextLoanDueDate, paymentTypeLabel, projectSchedule } from '../lib/shared'

// Port of features/loans/LoansView.jsx + LoanDetailView.jsx (mobile layout).
const CARD = 'rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card'
const ICON_BTN = 'rounded-xl border border-white/10 light:border-black/10 p-2.5'
const statusPill = (status) => (status === 'closed' ? ['bg-emerald-400/15', 'text-emerald-200 light:text-emerald-700'] : ['bg-accent-400/15', 'text-accent-200 light:text-accent-700'])

function StatusPill({ status }) {
  const [bg, text] = statusPill(status)
  return <View className={tw('rounded-full px-2 py-0.5', bg)}><Text className={tw('text-[10px] uppercase tracking-widest', text)}>{status}</Text></View>
}

export function LoansView({ data, onAdd, onEdit, onDelete, onPay, onDeletePayment, onDeletePaymentBulk, onSync, showMoney, onToggleMoney, onDetailChange }) {
  const { loans = [], loan_payments = [], accounts = [] } = data
  const [selectedLoanId, setSelectedLoanId] = useState(null)
  const selectedLoan = loans.find((l) => l.id === selectedLoanId)
  useEffect(() => { onDetailChange?.(selectedLoan ? selectedLoanId : null) }, [selectedLoanId, !!selectedLoan])

  if (selectedLoan) {
    return (
      <LoanDetailView loan={selectedLoan} payments={loan_payments.filter((p) => p.loan_id === selectedLoan.id)} accounts={accounts}
        onBack={() => setSelectedLoanId(null)} onPay={onPay} onDeletePayment={onDeletePayment} onDeletePaymentBulk={onDeletePaymentBulk}
        onEdit={onEdit} onDelete={(l) => onDelete(l, () => setSelectedLoanId(null))} onSync={onSync} showMoney={showMoney} onToggleMoney={onToggleMoney} />
    )
  }

  const openLoans = loans.filter((l) => l.status !== 'closed')
  const totalOutstanding = openLoans.reduce((s, l) => s + liveOutstanding(l, loan_payments.filter((p) => p.loan_id === l.id)), 0)
  const totalEmi = openLoans.reduce((s, l) => s + Number(l.emi_amount || 0), 0)
  const totalPaidAll = loans.reduce((s, l) => s + loan_payments.filter((p) => p.loan_id === l.id).reduce((s2, p) => s2 + Number(p.amount || 0), 0), 0)

  return (
    <View className="gap-5 pb-8">
      <View className="flex-row items-end justify-between gap-3">
        <View>
          <Text className={tw('mb-2 text-xs uppercase tracking-widest text-accent-200/70 light:text-accent-700')}>Debt clarity</Text>
          <Text className={tw('text-3xl font-semibold tracking-tight text-white light:text-slate-900')}>Loans</Text>
        </View>
        <Pressable onPress={onToggleMoney} className={tw(ICON_BTN)}><Icon as={showMoney ? Eye : EyeOff} size={16} className={tw('text-slate-400 light:text-slate-500')} /></Pressable>
      </View>

      {loans.length > 0 && (
        <View className={tw('rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] p-6 glassy:glass-card')}>
          <Text className="text-xs uppercase tracking-widest text-slate-500">Total outstanding</Text>
          <Text className={tw('mt-1 text-[32px] font-semibold leading-[36px] text-white light:text-slate-900')}>{showMoney ? money(totalOutstanding) : '••••••••'}</Text>
          <Text className="mt-1 text-sm text-slate-500">{openLoans.length} active loan{openLoans.length === 1 ? '' : 's'}</Text>
          {(totalEmi > 0 || totalPaidAll > 0) && (
            <View className="mt-5 flex-row gap-3">
              <HeroStatTile label="Combined EMI / month" value={showMoney ? money(totalEmi) : '••••'} />
              <HeroStatTile label="Total paid so far" value={showMoney ? money(totalPaidAll) : '••••'} valueTone="text-emerald-300 light:text-emerald-700" />
            </View>
          )}
        </View>
      )}

      {loans.length === 0 ? (
        <View className={tw(CARD)}><EmptyState icon={Landmark} title="No loans yet" message="Log home, car or personal loans and track EMIs + prepayments." cta="Add loan" onCta={onAdd} /></View>
      ) : (
        <View className="gap-6">
          {loans.map((loan) => {
            const payments = loan_payments.filter((p) => p.loan_id === loan.id)
            const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
            const principal = Number(loan.principal || 0)
            const outstanding = Number(loan.outstanding || 0)
            const todaysOutstanding = liveOutstanding(loan, payments)
            const cleared = principal > 0 ? Math.max(0, Math.min(100, Math.round(((principal - outstanding) / principal) * 100))) : 0
            const account = accounts.find((a) => a.id === loan.paid_from_account_id)
            return (
              <Pressable key={loan.id} onPress={() => setSelectedLoanId(loan.id)} className={tw(CARD, 'gap-5 px-5 py-5 active:opacity-80')}>
                <View>
                  <View className="flex-row items-start gap-2">
                    <Text className={tw('flex-shrink text-base font-semibold text-white light:text-slate-900')}>{loan.name}</Text>
                    <StatusPill status={loan.status} />
                  </View>
                  <Text className="mt-1 text-xs text-slate-500">{loan.lender || 'Lender'} · EMI {money(loan.emi_amount)} · {loan.interest_rate}% p.a. · {loan.tenure_months} mo</Text>
                  {account ? <Text className="mt-1 text-[11px] text-slate-500">Paying from {account.name}</Text> : null}
                </View>
                <View>
                  <Text className="text-xs text-slate-500">Outstanding</Text>
                  <Text className={tw('text-xl font-semibold text-white light:text-slate-900')}>{showMoney ? money(todaysOutstanding) : '••••'}</Text>
                  <View className={tw('mt-2 h-1.5 overflow-hidden rounded-full bg-white/5 light:bg-black/5')}><View className="h-full rounded-full bg-emerald-400" style={{ width: `${cleared}%` }} /></View>
                  <Text className={tw('mt-1 text-[11px] text-emerald-300 light:text-emerald-700')}>{cleared}% cleared</Text>
                </View>
                <View>
                  <Text className="text-xs text-slate-500">Total paid</Text>
                  <Text className={tw('text-xl font-semibold text-white light:text-slate-900')}>{showMoney ? money(totalPaid) : '••••'}</Text>
                  {Number(loan.interest_saved || 0) > 0 ? <Text className={tw('mt-2 text-[11px] text-emerald-300 light:text-emerald-700')}>Interest saved {money(loan.interest_saved)}</Text> : null}
                </View>
                <Pressable disabled={loan.status === 'closed'} onPress={() => onPay(loan)} className={tw('self-start', loan.status === 'closed' && 'opacity-50')}>
                  <AccentGradient dir="r" style={{ borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}><Text className="text-xs font-semibold text-[#07101c]">Log payment</Text></AccentGradient>
                </Pressable>
              </Pressable>
            )
          })}
        </View>
      )}
    </View>
  )
}

function LoanDetailView({ loan, payments, accounts, onBack, onPay, onDeletePayment, onDeletePaymentBulk, onEdit, onDelete, onSync, showMoney, onToggleMoney }) {
  const [syncOpen, setSyncOpen] = useState(false)
  const [syncValue, setSyncValue] = useState('')
  const [syncBusy, setSyncBusy] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const principal = Number(loan.principal || 0)
  const outstanding = Number(loan.outstanding || 0)
  const emi = Number(loan.emi_amount || 0)
  const rate = Number(loan.interest_rate || 0)
  const account = accounts.find((a) => a.id === loan.paid_from_account_id)
  const cleared = principal > 0 ? Math.max(0, Math.min(100, Math.round(((principal - outstanding) / principal) * 100))) : 0
  const outstandingExceedsPrincipal = outstanding > principal
  const todaysOutstanding = useMemo(() => liveOutstanding(loan, payments), [loan, payments])
  const accruedSinceLastPayment = Math.max(0, todaysOutstanding - outstanding)
  const coversEmi = (p) => p.type !== 'adjustment' && (p.covers_emi ?? (Number(p.amount) >= Number(p.emi_before || 0) - 0.01))
  const emisPaid = payments.filter(coversEmi).length
  const nextDueDate = useMemo(() => nextLoanDueDate(loan, new Date(), payments) || todayISO(), [loan.emi_due_day, payments])
  const schedule = useMemo(() => (loan.status === 'closed' ? [] : projectSchedule({ outstanding, annualRatePct: rate, emiAmount: emi, startDate: nextDueDate })), [outstanding, rate, emi, loan.status, nextDueDate])
  const monthsRemaining = schedule.length
  const totalInterestPaid = payments.reduce((s, p) => s + Number(p.interest_portion || 0), 0)
  const payoffDate = loan.status !== 'closed' && monthsRemaining > 0 ? (() => { const d = new Date(); d.setMonth(d.getMonth() + monthsRemaining); return dateToLocalISO(d) })() : null

  const emiCalendar = useMemo(() => {
    const totalOriginal = Number(loan.tenure_months || 0)
    if (totalOriginal <= 0 || !loan.start_date) return []
    const day = loan.emi_due_day ? Number(loan.emi_due_day) : new Date(`${loan.start_date}T00:00:00`).getDate()
    const totalNow = emisPaid + monthsRemaining
    const cursor = new Date(`${loan.start_date}T00:00:00`)
    cursor.setDate(1)
    cursor.setMonth(cursor.getMonth() + 1)
    const months = []
    for (let i = 0; i < totalOriginal; i++) {
      const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), Math.min(day, daysInMonth))
      months.push({ date, status: i < emisPaid ? 'paid' : i < totalNow ? 'upcoming' : 'saved' })
      cursor.setMonth(cursor.getMonth() + 1)
    }
    return months
  }, [loan.tenure_months, loan.start_date, loan.emi_due_day, emisPaid, monthsRemaining])
  const monthsSaved = emiCalendar.length - emisPaid - monthsRemaining
  const emiCalendarByYear = useMemo(() => {
    const groups = {}
    emiCalendar.forEach((m) => { const y = m.date.getFullYear(); (groups[y] = groups[y] || []).push(m) })
    return groups
  }, [emiCalendar])

  const { paymentCycleDates, freshCyclePayments } = useMemo(() => {
    const chrono = [...payments].filter((p) => p.type !== 'adjustment').sort((a, b) => (a.payment_date === b.payment_date ? new Date(a.created_at) - new Date(b.created_at) : new Date(a.payment_date) - new Date(b.payment_date)))
    const dateMap = new Map()
    const freshSet = new Set()
    let cursor = 0
    chrono.forEach((p, i) => {
      const prev = chrono[i - 1]
      if (!(prev && prev.payment_date === p.payment_date)) freshSet.add(p.id)
      if (coversEmi(p) && emiCalendar[cursor]) { dateMap.set(p.id, emiCalendar[cursor].date); cursor++ }
    })
    return { paymentCycleDates: dateMap, freshCyclePayments: freshSet }
  }, [payments, emiCalendar])

  const prepaymentEvents = payments
    .filter((p) => p.prepay_mode)
    .map((p) => ({ ...p, extra: p.covers_emi === false || !freshCyclePayments.has(p.id) ? Number(p.amount) : Math.max(0, Number(p.amount) - Number(p.emi_before || 0)) }))
  const totalExtraPrepaid = prepaymentEvents.reduce((s, p) => s + p.extra, 0)

  const paymentRowLabel = (p) => {
    if (p.type === 'adjustment') return 'Synced with lender'
    const cycleDate = paymentCycleDates.get(p.id)
    if (!cycleDate) return paymentTypeLabel(p)
    const modeSuffix = p.prepay_mode ? ` · ${p.prepay_mode === 'reduce_emi' ? 'Reduce EMI' : 'Reduce tenure'}` : ''
    return `${monthAbbr(dateToLocalISO(cycleDate))} EMI${p.prepay_mode ? ` + prepayment${modeSuffix}` : ''}`
  }

  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const toggleSelect = (id) => setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()) }
  const handleBulkDelete = async () => {
    const rows = [...selectedIds].map((id) => payments.find((p) => p.id === id)).filter(Boolean)
    if (await onDeletePaymentBulk(rows)) exitSelectMode()
  }

  const emiDue = (() => {
    if (!loan.emi_due_day || loan.status === 'closed') return null
    const dueIso = nextLoanDueDate(loan, new Date(), payments)
    const due = new Date(`${dueIso}T00:00:00`)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return { dueIso, days: Math.round((due - today) / 86400000) }
  })()
  const now = new Date()
  const menuItem = 'flex-row items-center gap-2 rounded-lg px-3 py-2'
  const menuText = tw('text-sm text-slate-300 light:text-slate-700')

  return (
    <View className="gap-5 pb-8">
      <Pressable onPress={onBack} className="flex-row items-center gap-1.5"><Icon as={ChevronLeft} size={14} className={tw('text-slate-400 light:text-slate-500')} /><Text className={tw('text-sm text-slate-400 light:text-slate-500')}>Back to loans</Text></Pressable>

      <View className="z-20 flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className={tw('text-3xl font-semibold tracking-tight text-white light:text-slate-900')}>{loan.name}</Text>
            <StatusPill status={loan.status} />
          </View>
          <Text className="mt-1 text-sm text-slate-500">{loan.lender || 'Lender'}{account ? ` · Paying from ${account.name}` : ''}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable onPress={onToggleMoney} className={tw(ICON_BTN)}><Icon as={showMoney ? Eye : EyeOff} size={16} className={tw('text-slate-400 light:text-slate-500')} /></Pressable>
          <View className="relative">
            <Pressable onPress={() => setMoreOpen((o) => !o)} className={tw('rounded-xl border p-2.5', moreOpen ? 'border-accent-300/40 bg-accent-400/10' : 'border-white/10 light:border-black/10')}><Icon as={MoreVertical} size={16} className={moreOpen ? 'text-accent-200 light:text-accent-700' : 'text-slate-400 light:text-slate-500'} /></Pressable>
            {moreOpen && (
              <View className={tw('absolute right-0 top-12 z-30 w-48 rounded-xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-1')}>
                <Pressable onPress={() => { setMoreOpen(false); setSyncOpen((o) => !o) }} className={menuItem}><Icon as={RefreshCw} size={14} className={tw('text-slate-300 light:text-slate-700')} /><Text className={menuText}>Sync</Text></Pressable>
                <Pressable onPress={() => { setMoreOpen(false); onEdit(loan) }} className={menuItem}><Icon as={Pencil} size={14} className={tw('text-slate-300 light:text-slate-700')} /><Text className={menuText}>Edit loan</Text></Pressable>
                <Pressable onPress={() => { setMoreOpen(false); onDelete(loan) }} className={menuItem}><Icon as={Trash2} size={14} className={tw('text-rose-300/70 light:text-rose-700')} /><Text className={tw('text-sm text-rose-300/70 light:text-rose-700')}>Delete loan</Text></Pressable>
              </View>
            )}
          </View>
        </View>
      </View>

      {syncOpen && (
        <View className="rounded-xl border border-accent-300/20 bg-accent-400/[.03] p-4">
          <Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Sync with your lender's app</Text>
          <Text className="mt-1 text-[11px] text-slate-500">The Outstanding figure above already includes today's not-yet-billed interest, same as your lender's app. If there's still a small gap after that — rounding, an unmodeled fee — enter your lender's figure here to close it, without logging it as a payment.</Text>
          <View className="mt-3 flex-row flex-wrap items-center gap-2">
            <TextInput keyboardType="decimal-pad" value={syncValue} onChangeText={setSyncValue} placeholder={String(Math.round(todaysOutstanding))} placeholderTextColor="#64748b" className={tw('w-40 rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-2 text-sm text-white light:text-slate-900')} />
            <Pressable disabled={syncBusy || !syncValue} onPress={async () => { setSyncBusy(true); await onSync(loan, Number(syncValue)); setSyncBusy(false); setSyncOpen(false); setSyncValue('') }} className={tw((syncBusy || !syncValue) && 'opacity-50')}>
              <AccentGradient dir="r" style={{ borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 }}><Text className="text-sm font-semibold text-[#07101c]">{syncBusy ? 'Syncing…' : 'Sync'}</Text></AccentGradient>
            </Pressable>
            {syncValue ? <Text className="text-[11px] text-slate-500">{Number(syncValue) < todaysOutstanding ? `${money(todaysOutstanding - Number(syncValue))} lower than tracked` : Number(syncValue) > todaysOutstanding ? `${money(Number(syncValue) - todaysOutstanding)} higher — likely fees/charges` : 'Matches already'}</Text> : null}
          </View>
        </View>
      )}

      {emiDue && (
        <DismissibleBanner id={`loan-emi-due-${loan.id}-${now.getFullYear()}-${now.getMonth()}`} tone={emiDue.days <= 3 ? 'amber' : 'slate'}>
          {`Next EMI due ${formatDate(emiDue.dueIso)} · ${emiDue.days > 0 ? `in ${emiDue.days} day${emiDue.days === 1 ? '' : 's'}` : emiDue.days === 0 ? 'today' : 'overdue'}`}
        </DismissibleBanner>
      )}
      {outstandingExceedsPrincipal && (
        <DismissibleBanner id={`loan-outstanding-anomaly-${loan.id}`} tone="amber">
          {`Outstanding (${money(outstanding)}) is higher than Principal (${money(principal)}) — that shouldn't happen. Double-check the Principal amount by editing this loan.`}
        </DismissibleBanner>
      )}

      <View className="flex-row flex-wrap gap-3">
        {[
          <StatCard key="o" label="Outstanding" value={showMoney ? money(todaysOutstanding) : '••••'} icon={Landmark} accent="bg-rose-400/15 text-rose-200 light:text-rose-700" tone="text-rose-300 light:text-rose-700" sub={`${cleared}% cleared${accruedSinceLastPayment > 0.5 ? ` · +${money(accruedSinceLastPayment)} accrued today` : ''}`} />,
          <StatCard key="e" label="EMI" value={showMoney ? money(emi) : '••••'} icon={RefreshCw} accent="bg-accent-300/15 text-accent-200 light:text-accent-700" tone="text-slate-500" sub={`${rate}% p.a.`} />,
          <StatCard key="p" label="EMIs paid" value={String(emisPaid)} icon={Target} accent="bg-accent-400/15 text-accent-200 light:text-accent-700" tone="text-slate-500" sub={`of ~${loan.status === 'closed' ? emisPaid : emisPaid + monthsRemaining} total`} />,
          <StatCard key="r" label="EMIs remaining" value={loan.status === 'closed' ? '0' : String(monthsRemaining)} icon={Target} accent="bg-emerald-400/15 text-emerald-200 light:text-emerald-700" tone="text-slate-500" sub={payoffDate ? `payoff ~${formatDate(payoffDate)}` : 'Paid off'} />,
          <StatCard key="i" label="Interest paid" value={showMoney ? money(totalInterestPaid) : '••••'} icon={ArrowDownRight} accent="bg-amber-400/15 text-amber-200 light:text-amber-700" tone="text-amber-300 light:text-amber-700" sub="so far" />,
          <StatCard key="s" label="Interest saved" value={showMoney ? money(loan.interest_saved || 0) : '••••'} icon={ArrowUpRight} accent="bg-emerald-400/15 text-emerald-200 light:text-emerald-700" sub="from prepayments" />,
        ].map((node) => <View key={node.key} style={{ width: '48%', flexGrow: 1 }}>{node}</View>)}
      </View>

      {prepaymentEvents.length > 0 && (
        <View className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[.03]">
          <View className={tw('flex-row flex-wrap items-center justify-between gap-2 border-b border-white/10 light:border-black/10 px-5 py-3')}>
            <Text className="text-xs uppercase tracking-widest text-slate-500">Prepayments · {prepaymentEvents.length}</Text>
            <Text className={tw('text-xs text-slate-400 light:text-slate-500')}>
              <Text className={tw('font-semibold text-white light:text-slate-900')}>{showMoney ? money(totalExtraPrepaid) : '••••'}</Text> extra paid · <Text className={tw('font-semibold text-emerald-300 light:text-emerald-700')}>{showMoney ? money(loan.interest_saved || 0) : '••••'}</Text> saved
            </Text>
          </View>
          {prepaymentEvents.map((p, i) => (
            <Pressable key={p.id} onLongPress={() => onDeletePayment(p)} delayLongPress={500} className={tw('flex-row items-center gap-3 px-5 py-3', i > 0 && 'border-t border-white/5 light:border-black/5')}>
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10"><Icon as={Sparkles} size={16} className={tw('text-emerald-300 light:text-emerald-700')} /></View>
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className={tw('text-sm font-medium text-white light:text-slate-900')}>{formatDate(p.payment_date)}</Text>
                <Text numberOfLines={1} className="text-[11px] text-slate-500">{p.extra < Number(p.amount) - 0.01 ? 'On top of EMI' : 'Standalone'} · {showMoney ? money(p.interest_saved || 0) : '••••'} saved</Text>
              </View>
              <Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>{showMoney ? `+${money(p.extra)}` : '••••'}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View className={tw(CARD)}>
        {selectMode ? (
          <View className={tw('flex-row items-center gap-2 border-b border-white/10 light:border-black/10 px-5 py-3')}>
            <Pressable onPress={exitSelectMode} className={tw('rounded-xl border border-white/10 light:border-black/10 p-2')}><Icon as={X} size={15} className={tw('text-slate-400 light:text-slate-500')} /></Pressable>
            <Text className={tw('flex-1 text-sm font-medium text-white light:text-slate-900')}>{selectedIds.size} selected</Text>
            <Pressable disabled={selectedIds.size === 0} onPress={handleBulkDelete} className={tw('rounded-xl border border-rose-300/30 bg-rose-300/10 p-2', selectedIds.size === 0 && 'opacity-40')}><Icon as={Trash2} size={15} className={tw('text-rose-300 light:text-rose-700')} /></Pressable>
          </View>
        ) : (
          <View className={tw('border-b border-white/10 light:border-black/10 px-5 py-3')}><Text className="text-xs uppercase tracking-widest text-slate-500">Payment history · {payments.length}</Text></View>
        )}
        {payments.length === 0 ? (
          <Text className="px-5 py-6 text-sm text-slate-500">No payments logged yet.</Text>
        ) : payments.map((p, i) => {
          const typeLabel = p.type === 'adjustment' ? 'Synced' : p.prepay_mode ? (p.prepay_mode === 'reduce_emi' ? 'Reduce EMI' : 'Reduce tenure') : p.type === 'emi' ? 'EMI' : 'Prepayment'
          const selected = selectedIds.has(p.id)
          return (
            <Pressable key={p.id} onPress={() => { if (selectMode) toggleSelect(p.id) }} onLongPress={() => { if (!selectMode) { setSelectMode(true); toggleSelect(p.id) } }} delayLongPress={500}
              className={tw('flex-row items-center gap-3 px-5 py-3', i > 0 && 'border-t border-white/5 light:border-black/5')}>
              {selectMode ? (
                selected ? <Icon as={CheckCircle2} size={22} className="text-accent-400" /> : <View className={tw('h-[22px] w-[22px] rounded-full border-2 border-white/20 light:border-black/20')} />
              ) : (
                <View className={tw('h-9 w-9 items-center justify-center rounded-xl bg-white/[.05] light:bg-black/[.035]')}><Icon as={p.type === 'adjustment' ? RefreshCw : ArrowDownRight} size={16} className={tw('text-accent-200 light:text-accent-700')} /></View>
              )}
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className={tw('text-sm font-medium text-white light:text-slate-900')}>{paymentRowLabel(p)}</Text>
                <Text numberOfLines={1} className="text-[11px] text-slate-500">{typeLabel} · {formatDate(p.payment_date)}</Text>
              </View>
              <Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>{showMoney ? money(p.amount) : '••••'}</Text>
            </Pressable>
          )
        })}
      </View>

      {emiCalendar.length > 0 && (
        <View className={tw(CARD)}>
          <Pressable onPress={() => setScheduleOpen((o) => !o)} className="flex-row items-center justify-between gap-2 px-5 py-3">
            <Text className="flex-1 text-xs uppercase tracking-widest text-slate-500">EMI calendar · {emisPaid} paid, {monthsRemaining} to go{monthsSaved > 0 ? `, ${monthsSaved} saved` : ''} of {emiCalendar.length} original</Text>
            <View style={{ transform: [{ rotate: scheduleOpen ? '180deg' : '0deg' }] }}><Icon as={ChevronDown} size={14} className="text-slate-500" /></View>
          </Pressable>
          {scheduleOpen && (
            <View className={tw('border-t border-white/10 light:border-black/10')}>
              {Object.entries(emiCalendarByYear).map(([year, months]) => (
                <View key={year}>
                  <View className={tw('border-b border-white/5 light:border-black/5 bg-[#161d2c] light:bg-black/[.04] px-5 py-2')}><Text className={tw('text-xs font-semibold text-accent-200/80 light:text-accent-700')}>{year}</Text></View>
                  <View className="flex-row flex-wrap px-5 py-3">
                    {months.map((m) => (
                      <View key={m.date.toISOString()} style={{ width: '50%' }} className="flex-row items-center gap-2 px-2 py-1.5">
                        {m.status === 'paid' && <Icon as={CheckCircle2} size={14} className={tw('text-emerald-400 light:text-emerald-700')} />}
                        {m.status === 'upcoming' && <Icon as={Clock} size={14} className="text-slate-500" />}
                        {m.status === 'saved' && <Icon as={Sparkles} size={14} className="text-slate-700" />}
                        <Text className={tw('text-sm', m.status === 'saved' ? 'text-slate-600 line-through' : 'text-slate-300 light:text-slate-700')}>{formatDate(dateToLocalISO(m.date))}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
              {monthsSaved > 0 && (
                <View className={tw('flex-row items-center gap-2 border-t border-white/10 light:border-black/10 px-5 py-3')}>
                  <Icon as={Sparkles} size={13} className={tw('text-emerald-300 light:text-emerald-700')} />
                  <Text className={tw('flex-1 text-xs text-emerald-300 light:text-emerald-700')}>{monthsSaved} month{monthsSaved === 1 ? '' : 's'} saved off the original schedule thanks to your prepayments.</Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  )
}
