import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Animated, Pressable, Text, TextInput, View } from 'react-native'
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, CreditCard, Eye, EyeOff, Landmark, Lock,
  MoreVertical, Pencil, RefreshCw, RotateCcw, Target, Trash2, X,
} from 'lucide-react-native'
import { Icon } from '../ui/Icon'
import { BankCardFace } from '../ui/BankCardFace'
import { HeroStatTile } from '../ui/HeroStatTile'
import { EmptyState } from '../ui/EmptyState'
import { MonthCursor } from '../ui/MonthCursor'
import { BarChart } from '../ui/BarChart'
import { AccentGradient } from '../ui/Gradient'
import { tw } from '../lib/tw'
import { MONTH_NAMES, capitalizeFirst, dateToLocalISO, money, timeLabel } from '../lib/format'
import { currentSpendingCycle, nextBillDue, utilisationSeverity } from '../lib/shared'
import { hiddenTransferGroups, isHiddenTx, useHiddenTx } from '../state/HiddenTx'

// Native port of features/credit-cards/CreditCardsView.jsx + CreditCardFlip.jsx +
// CreditCardDetailView.jsx (phone layout).
const SEVERITY_TONE = { Healthy: 'text-emerald-300 light:text-emerald-700', Rising: 'text-amber-300 light:text-amber-700', High: 'text-rose-300 light:text-rose-700' }
const SEVERITY_BAR = { Healthy: 'bg-emerald-400', Rising: 'bg-amber-400', High: 'bg-rose-400' }
const formatDate = (d) => { if (!d) return ''; const dt = new Date(`${String(d).slice(0, 10)}T00:00:00`); return `${String(dt.getDate()).padStart(2, '0')}-${MONTH_NAMES[dt.getMonth()].slice(0, 3)}-${dt.getFullYear()}` }
const ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]) }
const billPaymentDescription = (card) => `Credit card bill · ${card.name}`

function buildActivity(card, cardTransactions, allTransactions) {
  const fromLog = cardTransactions.map((t) => ({ id: t.id, date: t.date, time: t.time, description: t.description, amount: Number(t.amount || 0), categoryId: t.category_id, direction: 'debit', status: t.status, source: 'log', row: t }))
  const fromLinked = allTransactions.filter((t) => t.linked_module === 'credit_card' && t.linked_module_id === card.id)
    .map((t) => ({ id: t.id, date: t.date, time: t.time, description: t.description, amount: Number(t.amount || 0), categoryId: t.category_id, direction: t.type === 'income' ? 'credit' : 'debit', status: null, source: 'linked', row: t }))
  return [...fromLog, ...fromLinked].sort((a, b) => new Date(b.date) - new Date(a.date) || String(b.time || '').localeCompare(String(a.time || '')))
}

function CreditCardFlip({ card, showMoney, onSpend, onPay, onViewDetails }) {
  const [flipped, setFlipped] = useState(false)
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => { Animated.timing(anim, { toValue: flipped ? 1 : 0, duration: 500, useNativeDriver: true }).start() }, [flipped])
  const front = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] })
  const back = anim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] })
  const util = Number(card.credit_limit) > 0 ? Math.min(100, Math.round((Number(card.current_outstanding) / Number(card.credit_limit)) * 100)) : 0
  const sev = utilisationSeverity(util)
  const nd = nextBillDue(card)
  return (
    <Pressable onPress={() => setFlipped((f) => !f)} className="w-full self-center" style={{ maxWidth: 340, aspectRatio: 85 / 54 }}>
      <Animated.View style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', transform: [{ perspective: 1500 }, { rotateY: front }] }}>
        <BankCardFace name={card.name} subtitle={card.bank || 'Credit card'} last4={card.last4} color={card.color || '#a78bfa'} style={{ height: '100%' }} />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', transform: [{ perspective: 1500 }, { rotateY: back }] }}
        className={tw('justify-between overflow-hidden rounded-2xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-3.5')}>
        <View>
          <View className="flex-row items-start justify-between gap-2">
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className={tw('text-sm font-semibold text-white light:text-slate-900')}>{card.name}</Text>
              <Text className="mt-0.5 text-[11px] text-slate-500">Bill on {card.billing_date} · Due in {nd.days > 0 ? `${nd.days}d` : nd.days === 0 ? 'today' : 'overdue'}</Text>
            </View>
            <Pressable onPress={() => setFlipped(false)} hitSlop={8} className="rounded-lg p-1"><Icon as={RotateCcw} size={13} className="text-slate-500" /></Pressable>
          </View>
          <View className="-mx-3.5 mt-1 h-1.5 bg-black/70" />
          <View className="mt-1.5 flex-row items-end justify-between">
            <View><Text className="text-[10px] text-slate-500">Outstanding</Text><Text className={tw('text-base font-semibold text-white light:text-slate-900')}>{showMoney ? money(card.current_outstanding) : '••••'}</Text></View>
            <View className="items-end"><Text className="text-[10px] text-slate-500">Limit</Text><Text className={tw('text-xs text-slate-300 light:text-slate-700')}>{showMoney ? money(card.credit_limit) : '••••'}</Text></View>
          </View>
          <View className="mt-1 flex-row items-center gap-2">
            <View className={tw('h-1.5 flex-1 overflow-hidden rounded-full border border-white/10 light:border-black/10 bg-white/[.08] light:bg-black/[.08]')}><View className={tw('h-full rounded-full', SEVERITY_BAR[sev.label])} style={{ width: `${util}%` }} /></View>
            <Text className={tw('text-[10px]', SEVERITY_TONE[sev.label])}>{util}%</Text>
          </View>
        </View>
        <View className="gap-1">
          <View className="flex-row gap-1.5">
            <Pressable onPress={() => onSpend(card)} className={tw('flex-1 items-center rounded-lg bg-white/[.06] light:bg-black/[.04] py-1')}><Text className={tw('text-[11px] font-semibold text-white light:text-slate-900')}>+ Log spend</Text></Pressable>
            <Pressable disabled={Number(card.current_outstanding) <= 0} onPress={() => onPay(card)} className={tw('flex-1', Number(card.current_outstanding) <= 0 && 'opacity-50')}>
              <AccentGradient dir="r" style={{ borderRadius: 8, paddingVertical: 4, alignItems: 'center' }}><Text className="text-[11px] font-semibold text-[#07101c]">Pay bill</Text></AccentGradient>
            </Pressable>
          </View>
          <Pressable onPress={() => onViewDetails(card)} className={tw('flex-row items-center justify-center gap-1.5 rounded-lg border border-white/10 light:border-black/10 py-1')}>
            <Text className={tw('text-[11px] font-medium text-accent-200 light:text-accent-700')}>View full details</Text><Icon as={ArrowRight} size={12} className="text-accent-200 light:text-accent-700" />
          </Pressable>
        </View>
      </Animated.View>
    </Pressable>
  )
}

function CreditCardDetailView({ card, cardTransactions, allTransactions, categories, onBack, onSpend, onPay, onEditTx, onDeleteActivityBulk, onDeleteTxBulk, onSyncOutstanding, onDelete, onEdit, showMoney, onToggleMoney }) {
  const [syncOpen, setSyncOpen] = useState(false)
  const [syncValue, setSyncValue] = useState('')
  const [syncBusy, setSyncBusy] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const util = Number(card.credit_limit) > 0 ? Math.min(100, Math.round((Number(card.current_outstanding) / Number(card.credit_limit)) * 100)) : 0
  const sev = utilisationSeverity(util)
  const activity = useMemo(() => buildActivity(card, cardTransactions, allTransactions), [card, cardTransactions, allTransactions])
  const nd = nextBillDue(card)
  const [monthCursor, setMonthCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } })
  const [showAllMonths, setShowAllMonths] = useState(false)
  const [cycleMode, setCycleMode] = useState(false)
  const [cycleOffset, setCycleOffset] = useState(0)
  const shiftMonth = (delta) => { setShowAllMonths(false); setMonthCursor((c) => { const d = new Date(c.year, c.month + delta, 1); return { year: d.getFullYear(), month: d.getMonth() } }) }
  const monthActivity = showAllMonths ? activity : activity.filter((a) => { const d = new Date(a.date); return d.getFullYear() === monthCursor.year && d.getMonth() === monthCursor.month })
  const cycleRefDate = (() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth() + cycleOffset, n.getDate()) })()
  const cycle = currentSpendingCycle(card, cycleRefDate)
  const cycleActivity = activity.filter((a) => { const d = new Date(a.date); return d >= cycle.start && d < cycle.end })
  const displayedActivity = cycleMode ? cycleActivity : monthActivity
  const displayedDebits = displayedActivity.filter((a) => a.direction === 'debit')
  const displayedTotal = displayedActivity.reduce((s, a) => s + (a.direction === 'debit' ? a.amount : -a.amount), 0)
  const reimbursableTotal = displayedDebits.filter((a) => a.row?.is_reimbursable).reduce((s, a) => s + a.amount, 0)
  const ownTotal = displayedDebits.reduce((s, a) => s + a.amount, 0) - reimbursableTotal
  const { revealed: hiddenRevealed } = useHiddenTx()
  const hiddenGroups = hiddenTransferGroups(allTransactions)
  const rowHidden = (a) => a.source === 'linked' && isHiddenTx(a.row, hiddenGroups)
  const displayedRows = hiddenRevealed ? displayedActivity : displayedActivity.filter((a) => !rowHidden(a))

  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_NAMES[d.getMonth()].slice(0, 3), spend: 0 }) }
  activity.forEach((a) => { const d = new Date(a.date); const b = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`); if (b) b.spend += a.direction === 'debit' ? a.amount : -a.amount })

  const repayments = allTransactions.filter((t) => t.type === 'expense' && t.description === billPaymentDescription(card)).sort((a, b) => new Date(b.date) - new Date(a.date))
  const totalRepaid = repayments.reduce((s, t) => s + Number(t.amount || 0), 0)
  const repaymentRows = hiddenRevealed ? repayments : repayments.filter((t) => !isHiddenTx(t, hiddenGroups))

  const [selectSection, setSelectSection] = useState(null)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const toggleSelect = (id) => setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  const exitSelectMode = () => { setSelectSection(null); setSelectedIds(new Set()) }
  const longPress = (section, id) => { if (!selectSection) { setSelectSection(section); toggleSelect(id) } }
  const activityTap = (a) => { if (selectSection === 'activity') return toggleSelect(a.id); if (a.source === 'linked') onEditTx(a.row) }

  const iconBtn = 'rounded-xl border border-white/10 light:border-black/10 p-2.5'
  const selectBar = (onDelete) => (
    <View className={tw('flex-row items-center gap-2 border-b border-white/10 light:border-black/10 px-5 py-3')}>
      <Pressable onPress={exitSelectMode} className={tw('rounded-xl border border-white/10 light:border-black/10 p-2')}><Icon as={X} size={15} className="text-slate-400 light:text-slate-500" /></Pressable>
      <Text className={tw('flex-1 text-sm font-medium text-white light:text-slate-900')}>{selectedIds.size} selected</Text>
      <Pressable disabled={selectedIds.size === 0} onPress={async () => { if (await onDelete()) exitSelectMode() }} className={tw('rounded-xl border border-rose-300/30 bg-rose-300/10 p-2', selectedIds.size === 0 && 'opacity-40')}><Icon as={Trash2} size={15} className="text-rose-300 light:text-rose-700" /></Pressable>
    </View>
  )
  const check = (on, size = 22) => (on ? <Icon as={CheckCircle2} size={size} className="text-accent-400" /> : <View className={tw('rounded-full border-2 border-white/20 light:border-black/20')} style={{ width: size, height: size }} />)

  return (
    <View className="gap-5">
      <Pressable onPress={onBack} className="flex-row items-center gap-1.5"><Icon as={ChevronLeft} size={14} className="text-slate-400 light:text-slate-500" /><Text className={tw('text-sm text-slate-400 light:text-slate-500')}>Back to credit cards</Text></Pressable>

      <View className="gap-4">
        <View style={{ width: 288 }}><BankCardFace name={card.name} subtitle={card.bank || 'Credit card'} last4={card.last4} color={card.color || '#a78bfa'} /></View>
        <View className="flex-row flex-wrap justify-end gap-2">
          <Pressable disabled={Number(card.current_outstanding) <= 0} onPress={() => onPay(card)} className={tw(Number(card.current_outstanding) <= 0 && 'opacity-50')}>
            <AccentGradient dir="r" style={{ borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}><Text className="text-sm font-semibold text-[#07101c]">Pay bill</Text></AccentGradient>
          </Pressable>
          <Pressable onPress={onToggleMoney} className={tw(iconBtn)}><Icon as={showMoney ? Eye : EyeOff} size={16} className="text-slate-400 light:text-slate-500" /></Pressable>
          <View className="relative">
            <Pressable onPress={() => setMoreOpen((o) => !o)} className={tw('rounded-xl border p-2.5', moreOpen ? 'border-accent-300/40 bg-accent-400/10' : 'border-white/10 light:border-black/10')}><Icon as={MoreVertical} size={16} className={moreOpen ? 'text-accent-200 light:text-accent-700' : 'text-slate-400 light:text-slate-500'} /></Pressable>
            {moreOpen && (
              <View className={tw('absolute right-0 top-12 z-30 w-48 rounded-xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-1')}>
                <Pressable onPress={() => { setMoreOpen(false); setSyncOpen((o) => !o) }} className="flex-row items-center gap-2 rounded-lg px-3 py-2"><Icon as={RefreshCw} size={14} className="text-slate-300 light:text-slate-700" /><Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Sync outstanding</Text></Pressable>
                <Pressable onPress={() => { setMoreOpen(false); onEdit(card) }} className="flex-row items-center gap-2 rounded-lg px-3 py-2"><Icon as={Pencil} size={14} className="text-slate-300 light:text-slate-700" /><Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Edit card</Text></Pressable>
                <Pressable onPress={() => { setMoreOpen(false); onDelete(card) }} className="flex-row items-center gap-2 rounded-lg px-3 py-2"><Icon as={Trash2} size={14} className="text-rose-300/70 light:text-rose-700" /><Text className={tw('text-sm text-rose-300/70 light:text-rose-700')}>Delete card</Text></Pressable>
              </View>
            )}
          </View>
        </View>
      </View>

      {syncOpen && (
        <View className="rounded-xl border border-accent-300/20 bg-accent-400/[.03] p-4">
          <Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Sync with your card's real statement</Text>
          <Text className="mt-1 text-[11px] text-slate-500">If your card statement shows a different outstanding — a fee, forex markup, or a spend you never logged here — enter the real number and the difference is recorded as a "Balance sync" entry in this card's activity.</Text>
          <View className="mt-3 flex-row flex-wrap items-center gap-2">
            <TextInput keyboardType="decimal-pad" value={syncValue} onChangeText={setSyncValue} placeholder={String(Math.round(card.current_outstanding))} placeholderTextColor="#64748b" className={tw('w-40 rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-2 text-sm text-white light:text-slate-900')} />
            <Pressable disabled={syncBusy || !syncValue} onPress={async () => { setSyncBusy(true); await onSyncOutstanding(card, Number(syncValue)); setSyncBusy(false); setSyncOpen(false); setSyncValue('') }} className={tw((syncBusy || !syncValue) && 'opacity-50')}>
              <AccentGradient dir="r" style={{ borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 }}><Text className="text-sm font-semibold text-[#07101c]">{syncBusy ? 'Syncing…' : 'Sync'}</Text></AccentGradient>
            </Pressable>
            {syncValue ? <Text className="text-[11px] text-slate-500">{Number(syncValue) < Number(card.current_outstanding) ? `${money(Number(card.current_outstanding) - Number(syncValue))} lower than tracked` : Number(syncValue) > Number(card.current_outstanding) ? `${money(Number(syncValue) - Number(card.current_outstanding))} higher than tracked` : 'Matches already'}</Text> : null}
          </View>
        </View>
      )}

      <View className={tw('rounded-xl border px-4 py-3', nd.days <= 4 ? 'border-amber-300/30 bg-amber-300/5' : 'border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] glassy:glass-card')}>
        <Text className={tw('text-sm', nd.days <= 4 ? 'text-amber-200 light:text-amber-700' : 'text-slate-300 light:text-slate-700')}>Bill on the {ordinal(Number(card.billing_date))} · Due {nd.days > 0 ? `in ${nd.days} day${nd.days === 1 ? '' : 's'}` : nd.days === 0 ? 'today' : 'overdue'} ({formatDate(dateToLocalISO(nd.due))})</Text>
      </View>

      <View className={tw('rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] p-6 glassy:glass-card')}>
        <Text className="text-xs uppercase tracking-widest text-slate-500">Outstanding</Text>
        <Text className={tw('mt-1 text-[32px] font-semibold leading-[36px] text-rose-300 light:text-rose-700')}>{showMoney ? money(card.current_outstanding) : '••••••'}</Text>
        <Text className="mt-1 text-sm text-slate-500">of {money(card.credit_limit)} limit</Text>
        <View className="mt-5 flex-row gap-3">
          <HeroStatTile icon={Target} label="Utilisation" value={`${util}%`} valueTone={SEVERITY_TONE[sev.label]} sub={sev.label} />
          <HeroStatTile icon={ArrowUpRight} label="Total repaid" value={showMoney ? money(totalRepaid) : '••••'} valueTone="text-emerald-300 light:text-emerald-700" sub={`${repaymentRows.length} payment${repaymentRows.length === 1 ? '' : 's'}`} />
        </View>
      </View>

      <View className={tw('rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] p-5 glassy:glass-card')}>
        <Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>Net spend by month · last 6 months</Text>
        <View className="mt-4"><BarChart rows={months} valueKey="spend" colorFor={(m) => (m.spend < 0 ? '#34d399' : '#fb7185')} /></View>
      </View>

      <View className={tw('rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card')}>
        {selectSection === 'activity' ? selectBar(() => onDeleteActivityBulk(displayedRows.filter((a) => selectedIds.has(a.id)))) : (
          <View className={tw('gap-3 border-b border-white/10 light:border-black/10 px-5 py-3')}>
            <Text className="text-xs uppercase tracking-widest text-slate-500">Card activity · {displayedRows.length}{cycleMode ? <Text className="normal-case tracking-normal text-slate-600"> · {formatDate(dateToLocalISO(cycle.start))} – {formatDate(dateToLocalISO(cycle.end))}</Text> : null}</Text>
            <View className="flex-row flex-wrap items-center gap-2">
              <Pressable onPress={() => setCycleMode((v) => !v)} className={tw('rounded-xl border px-3 py-2', cycleMode ? 'border-accent-300/40 bg-accent-400/15' : 'border-white/10 light:border-black/10')}>
                <Text className={tw('text-[11px] font-semibold uppercase tracking-wider', cycleMode ? 'text-accent-200 light:text-accent-700' : 'text-slate-400 light:text-slate-500')}>This billing cycle</Text>
              </Pressable>
              {cycleMode ? (
                <View className={tw('flex-row items-center rounded-xl border border-white/10 light:border-black/10')}>
                  <Pressable onPress={() => setCycleOffset((o) => o - 1)} className="rounded-l-xl p-2"><Icon as={ChevronLeft} size={14} className="text-slate-400 light:text-slate-500" /></Pressable>
                  <Text className={tw('px-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300 light:text-slate-700')}>{cycleOffset === 0 ? 'Current' : `${Math.abs(cycleOffset)} back`}</Text>
                  <Pressable disabled={cycleOffset >= 0} onPress={() => setCycleOffset((o) => Math.min(0, o + 1))} className={tw('rounded-r-xl p-2', cycleOffset >= 0 && 'opacity-30')}><Icon as={ChevronRight} size={14} className="text-slate-400 light:text-slate-500" /></Pressable>
                </View>
              ) : <MonthCursor cursor={monthCursor} onShift={shiftMonth} showAll={showAllMonths} onToggleAll={() => setShowAllMonths((v) => !v)} />}
            </View>
          </View>
        )}
        {displayedRows.length === 0 ? (
          <EmptyState compact icon={ArrowDownRight} title={cycleMode ? 'No activity this billing cycle' : showAllMonths ? 'No activity yet' : 'No activity this month'} message="Log a spend, or pay for something with this card, to see it here." cta="Log spend" onCta={() => onSpend(card)} />
        ) : displayedRows.map((a, i) => {
          const cat = categories.find((c) => c.id === a.categoryId)
          const isDebit = a.direction === 'debit'
          return (
            <Pressable key={`${a.source}-${a.id}`} onPress={() => activityTap(a)} onLongPress={() => longPress('activity', a.id)} delayLongPress={500} className={tw('flex-row items-center gap-3 px-5 py-3', i > 0 && 'border-t border-white/5 light:border-black/5')}>
              {selectSection === 'activity' ? check(selectedIds.has(a.id)) : (
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-white/[.05] light:bg-black/[.035]">{isDebit ? <ArrowDownRight size={16} color={cat?.color || '#94a3b8'} /> : <ArrowUpRight size={16} color={cat?.color || '#94a3b8'} />}</View>
              )}
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center gap-1.5"><Text numberOfLines={1} className={tw('shrink text-sm font-medium text-white light:text-slate-900')}>{capitalizeFirst(a.description)}</Text>{rowHidden(a) ? <Icon as={Lock} size={11} className="text-slate-500" /> : null}</View>
                <Text numberOfLines={1} className="text-[11px] text-slate-500">{cat?.name || 'Uncategorised'} · {formatDate(a.date)}{a.time ? ` (${timeLabel(a.time)})` : ''}{a.status ? ` · ${a.status}` : ''}</Text>
              </View>
              <Text className={tw('text-sm font-semibold', isDebit ? 'text-rose-300 light:text-rose-700' : 'text-emerald-300 light:text-emerald-700')}>{isDebit ? '-' : '+'}{showMoney ? money(a.amount) : '••••'}</Text>
            </Pressable>
          )
        })}
        {displayedRows.length > 0 && (
          <View className={tw('flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-white/10 light:border-black/10 px-5 py-3')}>
            <Text className="text-xs uppercase tracking-widest text-slate-500">Total</Text>
            <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
              <Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>{showMoney ? money(displayedTotal) : '••••'}</Text>
              {reimbursableTotal > 0 && (
                <>
                  <Text className="text-sm text-slate-600">·</Text>
                  <Text className={tw('text-sm text-slate-400 light:text-slate-500')}>Yours <Text className={tw('font-semibold text-white light:text-slate-900')}>{showMoney ? money(ownTotal) : '••••'}</Text></Text>
                  <Text className="text-sm text-slate-600">·</Text>
                  <Text className={tw('text-sm text-amber-300 light:text-amber-700')}>To be repaid <Text className="font-semibold">{showMoney ? money(reimbursableTotal) : '••••'}</Text></Text>
                </>
              )}
            </View>
          </View>
        )}
      </View>

      <View className={tw('rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card')}>
        {selectSection === 'repayments' ? selectBar(() => onDeleteTxBulk([...selectedIds])) : (
          <Text className={tw('border-b border-white/10 light:border-black/10 px-5 py-3 text-xs uppercase tracking-widest text-slate-500')}>Repayment history · {repaymentRows.length}</Text>
        )}
        {repaymentRows.length === 0 ? <Text className="px-5 py-6 text-sm text-slate-500">No payments logged yet.</Text> : repaymentRows.map((r, i) => (
          <Pressable key={r.id} onPress={() => selectSection === 'repayments' && toggleSelect(r.id)} onLongPress={() => longPress('repayments', r.id)} delayLongPress={500} className={tw('flex-row items-center justify-between gap-3 px-5 py-3', i > 0 && 'border-t border-white/5 light:border-black/5')}>
            <View className="flex-row items-center gap-2">
              {selectSection === 'repayments' ? check(selectedIds.has(r.id), 18) : null}
              <Text className={tw('text-sm text-slate-300 light:text-slate-700')}>{formatDate(r.date)}</Text>
            </View>
            <Text className={tw('text-sm font-medium text-emerald-300 light:text-emerald-700')}>{showMoney ? `+${money(r.amount)}` : '••••'}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

export function CreditCardsView({ data, onSpend, onPay, onEditTx, onDeleteActivityBulk, onDeleteTxBulk, onSyncOutstanding, onDelete, onEdit, showMoney, onToggleMoney, onDetailChange }) {
  const { credit_cards = [], credit_card_transactions = [], categories, transactions } = data
  const [selectedCardId, setSelectedCardId] = useState(null)
  const selectedCard = credit_cards.find((c) => c.id === selectedCardId)
  useEffect(() => { onDetailChange?.(selectedCardId) }, [selectedCardId])

  if (selectedCard) {
    return (
      <CreditCardDetailView
        card={selectedCard} cardTransactions={credit_card_transactions.filter((t) => t.credit_card_id === selectedCard.id)} allTransactions={transactions} categories={categories}
        onBack={() => setSelectedCardId(null)} onSpend={onSpend} onPay={onPay} onEditTx={onEditTx} onDeleteActivityBulk={onDeleteActivityBulk} onDeleteTxBulk={onDeleteTxBulk}
        onSyncOutstanding={onSyncOutstanding} onDelete={(c) => { onDelete(c, () => setSelectedCardId(null)) }} onEdit={onEdit} showMoney={showMoney} onToggleMoney={onToggleMoney}
      />
    )
  }

  const totalOutstanding = credit_cards.reduce((s, c) => s + Number(c.current_outstanding || 0), 0)
  const totalLimit = credit_cards.reduce((s, c) => s + Number(c.credit_limit || 0), 0)
  const overallUtil = totalLimit > 0 ? Math.round((totalOutstanding / totalLimit) * 100) : 0
  const overallSeverity = utilisationSeverity(overallUtil)

  return (
    <View className="gap-5">
      <View className="flex-row items-end justify-between gap-3">
        <View>
          <Text className={tw('mb-2 text-xs uppercase tracking-widest text-accent-200/70 light:text-accent-700')}>Plastic tracker</Text>
          <Text className={tw('text-3xl font-semibold tracking-tight text-white light:text-slate-900')}>Credit cards</Text>
        </View>
        <Pressable onPress={onToggleMoney} className={tw('rounded-xl border border-white/10 light:border-black/10 p-2.5')}><Icon as={showMoney ? Eye : EyeOff} size={16} className="text-slate-400 light:text-slate-500" /></Pressable>
      </View>

      {credit_cards.length > 0 && (
        <View className={tw('rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] p-6 glassy:glass-card')}>
          <Text className="text-xs uppercase tracking-widest text-slate-500">Total outstanding</Text>
          <Text className={tw('mt-1 text-[32px] font-semibold leading-[36px] text-white light:text-slate-900')}>{showMoney ? money(totalOutstanding) : '••••••••'}</Text>
          <Text className="mt-1 text-sm text-slate-500">{credit_cards.length} card{credit_cards.length === 1 ? '' : 's'}</Text>
          <View className="mt-5 flex-row gap-3">
            <HeroStatTile icon={Landmark} label="Total limit" value={showMoney ? money(totalLimit) : '••••'} />
            <HeroStatTile icon={Target} label="Utilisation" value={`${overallUtil}%`} valueTone={SEVERITY_TONE[overallSeverity.label]} sub={overallSeverity.label} />
          </View>
        </View>
      )}

      {credit_cards.length === 0 ? (
        <View className={tw('rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card')}>
          <EmptyState icon={CreditCard} title="No credit cards yet" message="Track credit card spends, utilisation and pay bills without leaving the app." cta="Add first card" onCta={() => onEdit(null)} />
        </View>
      ) : (
        <View className="gap-6">
          {credit_cards.map((card) => <CreditCardFlip key={card.id} card={card} showMoney={showMoney} onSpend={onSpend} onPay={onPay} onViewDetails={(c) => setSelectedCardId(c.id)} />)}
        </View>
      )}
    </View>
  )
}
