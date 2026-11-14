import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { CheckCircle2, Clock, Coins, History, Pencil, RefreshCw, Trash2, TrendingDown, TrendingUp } from 'lucide-react-native'
import { Icon } from '../ui/Icon'
import { EmptyState } from '../ui/EmptyState'
import { HeroStatTile } from '../ui/HeroStatTile'
import { DismissibleBanner } from '../ui/DismissibleBanner'
import { BackLink, CARD, CollapsibleCard, EyeButton, HERO, MoreMenu, PageTitle, Pill, ProgressBar, SectionHeader, SelectBar, SelectMark, useSelection } from '../ui/DetailKit'
import { tw } from '../lib/tw'
import { dateToLocalISO, formatDate, money } from '../lib/format'
import { monthAbbr, nextChitFundDueDate, ordinal } from '../lib/shared'

// Port of features/chit-funds/ChitFundsView.jsx + ChitFundDetailView.jsx (mobile layout).
const netPaidOf = (payments, fundId) => payments.filter((p) => p.chit_fund_id === fundId).reduce((s, p) => s + Number(p.amount) - Number(p.dividend_received || 0), 0)
const payoutPill = (isCompleted, isTaken) => (isCompleted ? ['bg-slate-500/15', 'text-slate-400 light:text-slate-500'] : isTaken ? ['bg-amber-400/15', 'text-amber-200 light:text-amber-700'] : ['bg-accent-400/15', 'text-accent-200 light:text-accent-700'])

export function ChitFundsView({ data, onAdd, onEdit, onDelete, onLogPayment, onEditPayment, onTakePayout, onUndoPayout, onComplete, onReopen, onDeletePayment, showMoney, onToggleMoney, onDetailChange }) {
  const { chit_funds = [], chit_fund_payments = [], accounts = [] } = data
  const [showHistory, setShowHistory] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const selected = chit_funds.find((c) => c.id === selectedId)
  useEffect(() => { onDetailChange?.(selected ? selectedId : null) }, [selectedId, !!selected])

  if (selected) {
    return (
      <ChitFundDetailView fund={selected} payments={chit_fund_payments} accounts={accounts} onBack={() => setSelectedId(null)}
        onEdit={onEdit} onDelete={(c) => onDelete(c, () => setSelectedId(null))} onLogPayment={onLogPayment} onEditPayment={onEditPayment}
        onTakePayout={onTakePayout} onUndoPayout={onUndoPayout} onComplete={onComplete} onReopen={onReopen} onDeletePayment={onDeletePayment}
        showMoney={showMoney} onToggleMoney={onToggleMoney} />
    )
  }

  const active = chit_funds.filter((c) => c.status !== 'completed')
  const totalReceivable = active.filter((c) => c.payout_status === 'not_taken').reduce((s, c) => s + netPaidOf(chit_fund_payments, c.id), 0)
  const totalLiability = active.filter((c) => c.payout_status === 'taken').reduce((s, c) => {
    const monthsPaid = chit_fund_payments.filter((p) => p.chit_fund_id === c.id).length
    return s + Math.max(0, Number(c.duration_months) - monthsPaid) * Number(c.monthly_contribution)
  }, 0)
  const visible = showHistory ? chit_funds : active
  const completedCount = chit_funds.length - active.length

  const card = (c) => {
    const monthsPaid = chit_fund_payments.filter((p) => p.chit_fund_id === c.id).length
    const pct = Number(c.duration_months) > 0 ? Math.min(100, Math.round((monthsPaid / Number(c.duration_months)) * 100)) : 0
    const isCompleted = c.status === 'completed'
    const isTaken = c.payout_status === 'taken'
    const paid = netPaidOf(chit_fund_payments, c.id)
    const remaining = Math.max(0, Number(c.duration_months) - monthsPaid) * Number(c.monthly_contribution)
    const dueDate = !isCompleted ? nextChitFundDueDate(c, monthsPaid) : null
    const dueDays = dueDate ? Math.ceil((dueDate - new Date()) / 86400000) : null
    const [pbg, pfg] = payoutPill(isCompleted, isTaken)
    return (
      <Pressable key={c.id} onPress={() => setSelectedId(c.id)}
        className={tw('rounded-2xl border p-5 active:opacity-80', isCompleted ? 'border-white/5 light:border-black/5 bg-white/[.02] light:bg-black/[.02]' : isTaken ? 'border-amber-400/10 bg-amber-500/[.03]' : 'border-accent-300/10 bg-accent-400/[.03]')}>
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className={tw('text-base font-semibold text-white light:text-slate-900')}>{c.name}</Text>
          <Pill bg={pbg} fg={pfg}>{isTaken ? 'Payout Taken' : 'Not Taken'}</Pill>
          {isCompleted ? <Pill bg="bg-slate-500/15" fg="text-slate-400 light:text-slate-500">Completed</Pill> : null}
          {dueDays !== null && dueDays <= 4 ? <Pill bg="bg-rose-400/15" fg="text-rose-200 light:text-rose-700">{dueDays > 0 ? `due in ${dueDays}d` : dueDays === 0 ? 'due today' : 'overdue'}</Pill> : null}
        </View>
        <Text className="mt-1 text-xs text-slate-500">{money(c.monthly_contribution)}/mo · {formatDate(c.start_date)}</Text>
        <View className="mt-4 flex-row items-end justify-between">
          <View>
            <Text className="text-xs text-slate-500">{isTaken ? 'Outstanding liability' : 'Receivable'}</Text>
            <Text className={tw('text-2xl font-semibold', isCompleted ? 'text-slate-300 light:text-slate-700' : 'text-white light:text-slate-900')}>{showMoney ? money(isTaken ? remaining : paid) : '••••'}</Text>
          </View>
          <Text className="text-xs text-slate-500">{monthsPaid} of {c.duration_months} months paid</Text>
        </View>
        <ProgressBar pct={pct} color={isCompleted ? 'bg-slate-500' : isTaken ? 'bg-amber-400' : 'bg-accent-400'} />
      </Pressable>
    )
  }

  return (
    <View className="gap-5 pb-8">
      <PageTitle eyebrow="Rotating savings" title="Chit funds" />
      <View className="flex-row gap-2">
        <Pressable onPress={() => setShowHistory((v) => !v)} className={tw('flex-1 flex-row items-center justify-center gap-2 rounded-xl border px-4 py-2.5', showHistory ? 'border-accent-300/50 bg-accent-400/10' : 'border-white/10 light:border-black/10')}>
          <Icon as={History} size={15} className={showHistory ? 'text-accent-200 light:text-accent-700' : 'text-slate-400 light:text-slate-500'} />
          <Text className={tw('text-sm font-semibold', showHistory ? 'text-accent-200 light:text-accent-700' : 'text-slate-400 light:text-slate-500')}>{showHistory ? 'Hide completed' : 'View history'}</Text>
        </Pressable>
        <EyeButton showMoney={showMoney} onToggle={onToggleMoney} />
      </View>

      {chit_funds.length > 0 && (
        <View className={tw(HERO)}>
          <View className="flex-row gap-3">
            <HeroStatTile label="Total receivable" value={showMoney ? money(totalReceivable) : '••••'} valueTone="text-accent-300 light:text-accent-700" sub="Not yet taken payout" />
            <HeroStatTile label="Total remaining dues" value={showMoney ? money(totalLiability) : '••••'} valueTone="text-amber-300 light:text-amber-700" sub="Payout already taken" />
          </View>
        </View>
      )}

      {chit_funds.length === 0 ? (
        <View className={tw(CARD)}><EmptyState icon={Coins} title="No chit funds yet" message="Track a chit fund you're a member of — monthly payments, payout, and how it affects your net worth." cta="Add first chit fund" onCta={onAdd} /></View>
      ) : visible.length === 0 ? (
        <View className={tw(CARD)}><EmptyState icon={Coins} title="All completed" message={`${completedCount} chit fund${completedCount === 1 ? '' : 's'} completed. Tap "View history" to see them.`} /></View>
      ) : (
        <View className="gap-4">{visible.map(card)}</View>
      )}
    </View>
  )
}

function ChitFundDetailView({ fund, payments, accounts, onBack, onEdit, onDelete, onLogPayment, onEditPayment, onTakePayout, onUndoPayout, onComplete, onReopen, onDeletePayment, showMoney, onToggleMoney }) {
  const isTaken = fund.payout_status === 'taken'
  const isCompleted = fund.status === 'completed'
  const account = accounts.find((a) => a.id === fund.account_id)
  const paymentsForThis = payments.filter((p) => p.chit_fund_id === fund.id).sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
  const monthsPaid = paymentsForThis.length
  const pct = Number(fund.duration_months) > 0 ? Math.min(100, Math.round((monthsPaid / Number(fund.duration_months)) * 100)) : 0
  const netPaid = paymentsForThis.reduce((s, p) => s + Number(p.amount) - Number(p.dividend_received || 0), 0)
  const remaining = Math.max(0, Number(fund.duration_months) - monthsPaid) * Number(fund.monthly_contribution)
  const finalGainLoss = Number(fund.payout_amount || 0) - netPaid
  const dueDate = !isCompleted ? nextChitFundDueDate(fund, monthsPaid) : null
  const dueSoon = dueDate ? { days: Math.ceil((dueDate - new Date()) / 86400000), date: dueDate } : null
  const sel = useSelection()

  const calendarByYear = useMemo(() => {
    const total = Number(fund.duration_months || 0)
    if (total <= 0 || !fund.start_date) return {}
    const day = new Date(`${fund.start_date}T00:00:00`).getDate()
    const cursor = new Date(`${fund.start_date}T00:00:00`)
    const groups = {}
    for (let i = 0; i < total; i++) {
      const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), Math.min(day, daysInMonth))
      ;(groups[date.getFullYear()] = groups[date.getFullYear()] || []).push({ date, status: i < monthsPaid ? 'paid' : 'upcoming' })
      cursor.setMonth(cursor.getMonth() + 1)
    }
    return groups
  }, [fund.duration_months, fund.start_date, monthsPaid])

  const handleBulkDelete = () => {
    const ids = [...sel.selectedIds]
    if (ids.length === 0) return
    Alert.alert(`Delete ${ids.length} payment${ids.length === 1 ? '' : 's'}?`, 'Linked transactions (if any) will be removed too.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { for (const id of ids) await onDeletePayment(id, true); sel.exit() } },
    ])
  }
  const [pbg, pfg] = payoutPill(isCompleted, isTaken)

  return (
    <View className="gap-5 pb-8">
      <BackLink label="Back to chit funds" onPress={onBack} />

      <View className="z-20 flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className={tw('text-3xl font-semibold tracking-tight text-white light:text-slate-900')}>{fund.name}</Text>
            <Pill bg={pbg} fg={pfg}>{isTaken ? 'Payout Taken' : 'Not Taken'}</Pill>
            {isCompleted ? <Pill bg="bg-slate-500/15" fg="text-slate-400 light:text-slate-500">Completed</Pill> : null}
          </View>
          <Text className="mt-1 text-sm text-slate-500">{money(fund.monthly_contribution)}/mo · {formatDate(fund.start_date)}{account ? ` · ${account.name}` : ''}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <EyeButton showMoney={showMoney} onToggle={onToggleMoney} />
          <MoreMenu items={[
            { icon: Coins, label: 'Take payout', onPress: () => onTakePayout(fund), hidden: isTaken || isCompleted },
            { icon: RefreshCw, label: 'Undo payout', onPress: () => onUndoPayout(fund), hidden: !isTaken || isCompleted },
            { icon: CheckCircle2, label: 'Mark completed', onPress: () => onComplete(fund), hidden: !isTaken || isCompleted },
            { icon: RefreshCw, label: 'Reopen', onPress: () => onReopen(fund), hidden: !isCompleted },
            { icon: Pencil, label: 'Edit chit fund', onPress: () => onEdit(fund) },
            { icon: Trash2, label: 'Delete chit fund', onPress: () => onDelete(fund), danger: true },
          ]} />
        </View>
      </View>

      {dueSoon && dueSoon.days <= 4 && (
        <DismissibleBanner id={`chit-due-${fund.id}-${monthsPaid}`} tone={dueSoon.days <= 2 ? 'amber' : 'slate'}>
          {`Next payment due on the ${ordinal(dueSoon.date.getDate())} · ${dueSoon.days > 0 ? `in ${dueSoon.days} day${dueSoon.days === 1 ? '' : 's'}` : dueSoon.days === 0 ? 'today' : 'overdue'}`}
        </DismissibleBanner>
      )}

      {isCompleted && (
        <View className={tw('rounded-2xl border p-5', finalGainLoss >= 0 ? 'border-emerald-400/15 bg-emerald-500/[.03]' : 'border-rose-400/15 bg-rose-500/[.03]')}>
          <View className="flex-row items-center gap-2">
            <Icon as={finalGainLoss >= 0 ? TrendingUp : TrendingDown} size={13} className={finalGainLoss >= 0 ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700'} />
            <Text className="text-xs uppercase tracking-widest text-slate-500">Final result</Text>
          </View>
          <Text className={tw('mt-1 text-2xl font-semibold', finalGainLoss >= 0 ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700')}>{finalGainLoss >= 0 ? '+' : '−'}{showMoney ? money(Math.abs(finalGainLoss)) : '••••'}</Text>
          <Text className="mt-1 text-xs text-slate-500">{showMoney ? money(fund.payout_amount || 0) : '••••'} received, {showMoney ? money(netPaid) : '••••'} paid in across {monthsPaid} month{monthsPaid === 1 ? '' : 's'}</Text>
        </View>
      )}

      <View className={tw(HERO)}>
        <Text className="text-xs uppercase tracking-widest text-slate-500">{isTaken ? 'Outstanding liability' : 'Receivable'}</Text>
        <Text className={tw('mt-1 text-[32px] font-semibold leading-[36px] text-white light:text-slate-900')}>{showMoney ? money(isTaken ? remaining : netPaid) : '••••'}</Text>
        <ProgressBar pct={pct} className="mt-4 h-2" color={isCompleted ? 'bg-slate-500' : isTaken ? 'bg-amber-400' : 'bg-accent-400'} />
        <View className="mt-5 flex-row gap-3">
          <HeroStatTile label="Paid so far" value={showMoney ? money(netPaid) : '••••'} valueTone="text-accent-300 light:text-accent-700" sub={`${monthsPaid} of ${fund.duration_months} months`} />
          <HeroStatTile label={isTaken ? 'Payout received' : 'Progress'} value={isTaken ? (showMoney ? money(fund.payout_amount || 0) : '••••') : `${pct}%`} valueTone={isTaken ? 'text-emerald-300 light:text-emerald-700' : 'text-white light:text-slate-900'} sub={isTaken && fund.payout_month ? `Month ${fund.payout_month}` : undefined} />
        </View>
      </View>

      <View className={tw(CARD)}>
        {sel.selectMode ? <SelectBar count={sel.selectedIds.size} onCancel={sel.exit} onDelete={handleBulkDelete} /> : <SectionHeader>Payment history · {paymentsForThis.length}</SectionHeader>}
        {paymentsForThis.length === 0 ? (
          <EmptyState compact icon={Coins} title="No payments yet" message={isCompleted ? 'This chit fund is completed.' : 'Log it here each time you pay this month\'s contribution.'} cta={isCompleted ? undefined : 'Log payment'} onCta={isCompleted ? undefined : () => onLogPayment(fund)} />
        ) : paymentsForThis.map((p, i) => {
          const acc = accounts.find((a) => a.id === p.account_id)
          const dividend = Number(p.dividend_received || 0)
          return (
            <Pressable key={p.id} onPress={() => (sel.selectMode ? sel.toggle(p.id) : onEditPayment(fund, p))} onLongPress={() => sel.start(p.id)} delayLongPress={500}
              className={tw('flex-row items-center gap-3 px-5 py-3', i > 0 && 'border-t border-white/5 light:border-black/5')}>
              {sel.selectMode ? <SelectMark selected={sel.selectedIds.has(p.id)} /> : (
                <View className={tw('h-9 w-9 items-center justify-center rounded-xl bg-white/[.05] light:bg-black/[.035]')}><Icon as={Coins} size={16} className={tw('text-accent-200 light:text-accent-700')} /></View>
              )}
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className={tw('text-sm font-medium text-white light:text-slate-900')}>{monthAbbr(p.payment_date)} · Payment #{paymentsForThis.length - i}</Text>
                <Text numberOfLines={1} className="text-[11px] text-slate-500">{formatDate(p.payment_date)}{acc ? ` · ${acc.name}` : ''}{dividend > 0 ? ` · ${money(dividend)} dividend` : ''}</Text>
              </View>
              <Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>{showMoney ? money(p.amount) : '••••'}</Text>
            </Pressable>
          )
        })}
      </View>

      {Object.keys(calendarByYear).length > 0 && (
        <CollapsibleCard title={`Payment calendar · ${monthsPaid} paid, ${Math.max(0, fund.duration_months - monthsPaid)} to go of ${fund.duration_months} months`}>
          {Object.entries(calendarByYear).map(([year, months]) => (
            <View key={year}>
              <View className={tw('border-b border-white/5 light:border-black/5 bg-[#161d2c] light:bg-black/[.04] px-5 py-2')}><Text className={tw('text-xs font-semibold text-accent-200/80 light:text-accent-700')}>{year}</Text></View>
              <View className="flex-row flex-wrap px-5 py-3">
                {months.map((m) => (
                  <View key={m.date.toISOString()} style={{ width: '50%' }} className="flex-row items-center gap-2 px-2 py-1.5">
                    <Icon as={m.status === 'paid' ? CheckCircle2 : Clock} size={14} className={m.status === 'paid' ? 'text-emerald-400 light:text-emerald-700' : 'text-slate-500'} />
                    <Text className={tw('text-sm text-slate-300 light:text-slate-700')}>{formatDate(dateToLocalISO(m.date))}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </CollapsibleCard>
      )}
    </View>
  )
}
