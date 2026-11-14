import { useEffect, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import {
  ArrowDownRight, ArrowLeftRight, ArrowUpRight, CheckCircle2, ChevronLeft, Eye, EyeOff, Landmark, Lock, MoreVertical, Pencil,
  RefreshCw, Trash2, Wallet, X,
} from 'lucide-react-native'
import { Icon } from '../ui/Icon'
import { BankCardFace } from '../ui/BankCardFace'
import { HeroStatTile } from '../ui/HeroStatTile'
import { EmptyState } from '../ui/EmptyState'
import { MonthCursor } from '../ui/MonthCursor'
import { BarChart } from '../ui/BarChart'
import { AccentGradient } from '../ui/Gradient'
import { tw } from '../lib/tw'
import { MONTH_NAMES, capitalizeFirst, money, timeLabel } from '../lib/format'
import { getTransactionIcon } from '../lib/categoryIcons'
import { hiddenTransferGroups, isHiddenTx, useHiddenTx } from '../state/HiddenTx'

// Native port of features/accounts/AccountsView.jsx + AccountDetailView.jsx (phone layout).
const formatDateTime = (d, t) => { const dt = new Date(`${d}T00:00:00`); const base = `${String(dt.getDate()).padStart(2, '0')}-${MONTH_NAMES[dt.getMonth()].slice(0, 3)}-${dt.getFullYear()}`; return t ? `${base} (${timeLabel(t)})` : base }
const isInflow = (t) => t.type === 'income' || (t.type === 'transfer' && t.transfer_direction === 'in')
const isOutflow = (t) => t.type === 'expense' || (t.type === 'transfer' && t.transfer_direction === 'out')

function AccountDetailView({ account, debitCard, transactions, categories, onBack, onEdit, onDelete, onEditTx, onDeleteTxBulk, onSyncBalance, showMoney, onToggleMoney }) {
  const [syncOpen, setSyncOpen] = useState(false)
  const [syncValue, setSyncValue] = useState('')
  const [syncBusy, setSyncBusy] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const activity = transactions.filter((t) => t.account_id === account.id).sort((a, b) => new Date(b.date) - new Date(a.date) || String(b.time || '').localeCompare(String(a.time || '')))
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const toggleSelect = (id) => setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()) }
  const [monthCursor, setMonthCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } })
  const [showAllMonths, setShowAllMonths] = useState(false)
  const shiftMonth = (delta) => { setShowAllMonths(false); setMonthCursor((c) => { const d = new Date(c.year, c.month + delta, 1); return { year: d.getFullYear(), month: d.getMonth() } }) }
  const { revealed: hiddenRevealed } = useHiddenTx()
  const hiddenGroups = hiddenTransferGroups(transactions)
  const monthActivity = (showAllMonths ? activity : activity.filter((a) => { const d = new Date(a.date); return d.getFullYear() === monthCursor.year && d.getMonth() === monthCursor.month }))
    .filter((t) => hiddenRevealed || !isHiddenTx(t, hiddenGroups))
  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_NAMES[d.getMonth()].slice(0, 3), net: 0 }) }
  activity.forEach((t) => { const d = new Date(t.date); const b = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`); if (b) b.net += isInflow(t) ? Number(t.amount || 0) : -Number(t.amount || 0) })
  const thisMonthActivity = activity.filter((t) => { const d = new Date(t.date); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() })
  const inflow = thisMonthActivity.reduce((s, t) => (isInflow(t) ? s + Number(t.amount || 0) : s), 0)
  const outflow = thisMonthActivity.reduce((s, t) => (isOutflow(t) ? s + Number(t.amount || 0) : s), 0)
  const color = account.color || '#22d3ee'
  const iconBtn = 'rounded-xl border border-white/10 light:border-black/10 p-2.5'

  return (
    <View className="gap-5 pb-8">
      <Pressable onPress={onBack} className="flex-row items-center gap-1.5"><Icon as={ChevronLeft} size={14} className="text-slate-400 light:text-slate-500" /><Text className={tw('text-sm text-slate-400 light:text-slate-500')}>Back to accounts</Text></Pressable>

      <View className="flex-row flex-wrap items-start justify-between gap-3">
        {debitCard ? (
          <View style={{ width: 288 }}><BankCardFace name={debitCard.name || account.name} subtitle="Debit card" last4={debitCard.account_number_last4 || account.account_number_last4} color={color} /></View>
        ) : (
          <View className="flex-1 flex-row items-center gap-3">
            <View className="h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${color}22` }}>{account.type === 'cash' ? <Wallet size={22} color={color} /> : <Landmark size={22} color={color} />}</View>
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className={tw('text-lg font-semibold text-white light:text-slate-900')}>{account.name}</Text>
              <Text numberOfLines={1} className="text-xs capitalize text-slate-500">{account.type.replace('_', ' ')}{account.bank_name ? ` · ${account.bank_name}` : ''}{account.account_number_last4 ? ` · •${account.account_number_last4}` : ''}</Text>
            </View>
          </View>
        )}
        <View className="ml-auto flex-row items-center gap-2">
          <Pressable onPress={onToggleMoney} className={tw(iconBtn)}><Icon as={showMoney ? Eye : EyeOff} size={16} className="text-slate-400 light:text-slate-500" /></Pressable>
          <View className="relative">
            <Pressable onPress={() => setMoreOpen((o) => !o)} className={tw('rounded-xl border p-2.5', moreOpen ? 'border-accent-300/40 bg-accent-400/10' : 'border-white/10 light:border-black/10')}><Icon as={MoreVertical} size={16} className={moreOpen ? 'text-accent-200 light:text-accent-700' : 'text-slate-400 light:text-slate-500'} /></Pressable>
            {moreOpen && (
              <View className={tw('absolute right-0 top-12 z-30 w-52 rounded-xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-1')}>
                <Pressable onPress={() => { setMoreOpen(false); setSyncOpen((o) => !o) }} className="flex-row items-center gap-2 rounded-lg px-3 py-2"><Icon as={RefreshCw} size={14} className="text-slate-300 light:text-slate-700" /><Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Sync</Text></Pressable>
                <Pressable onPress={() => { setMoreOpen(false); onEdit(account) }} className="flex-row items-center gap-2 rounded-lg px-3 py-2"><Icon as={Pencil} size={14} className="text-slate-300 light:text-slate-700" /><Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Edit account</Text></Pressable>
                <Pressable onPress={() => { setMoreOpen(false); onDelete(account) }} className="flex-row items-center gap-2 rounded-lg px-3 py-2"><Icon as={Trash2} size={14} className="text-rose-300/70 light:text-rose-700" /><Text className={tw('text-sm text-rose-300/70 light:text-rose-700')}>Delete account</Text></Pressable>
              </View>
            )}
          </View>
        </View>
      </View>

      {syncOpen && (
        <View className="rounded-xl border border-accent-300/20 bg-accent-400/[.03] p-4">
          <Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Sync with your bank's real balance</Text>
          <Text className="mt-1 text-[11px] text-slate-500">If your bank's app shows a different number — a fee, interest credit, or a transaction you never logged here — enter the real balance and it'll be reconciled with a labeled adjustment entry.</Text>
          <View className="mt-3 flex-row flex-wrap items-center gap-2">
            <TextInput keyboardType="decimal-pad" value={syncValue} onChangeText={setSyncValue} placeholder={String(Math.round(account.current_balance))} placeholderTextColor="#64748b" className={tw('w-40 rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-2 text-sm text-white light:text-slate-900')} />
            <Pressable disabled={syncBusy || !syncValue} onPress={async () => { setSyncBusy(true); await onSyncBalance(account, Number(syncValue)); setSyncBusy(false); setSyncOpen(false); setSyncValue('') }} className={tw((syncBusy || !syncValue) && 'opacity-50')}>
              <AccentGradient dir="r" style={{ borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 }}><Text className="text-sm font-semibold text-[#07101c]">{syncBusy ? 'Syncing…' : 'Sync'}</Text></AccentGradient>
            </Pressable>
            {syncValue ? <Text className="text-[11px] text-slate-500">{Number(syncValue) < Number(account.current_balance) ? `${money(Number(account.current_balance) - Number(syncValue))} lower than tracked` : Number(syncValue) > Number(account.current_balance) ? `${money(Number(syncValue) - Number(account.current_balance))} higher than tracked` : 'Matches already'}</Text> : null}
          </View>
        </View>
      )}

      {debitCard && (
        <View className={tw('flex-row items-center justify-between rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] px-5 py-3 glassy:glass-card')}>
          <Text className={tw('text-sm text-white light:text-slate-900')}>{account.name}</Text>
          <Pressable onPress={() => onEdit(debitCard)}><Text className={tw('text-xs text-accent-300 light:text-accent-700')}>Edit card</Text></Pressable>
        </View>
      )}

      <View className={tw('rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] p-6 glassy:glass-card')}>
        <Text className="text-xs uppercase tracking-widest text-slate-500">Current balance</Text>
        <Text className={tw('mt-1 text-[32px] font-semibold leading-[36px] text-white light:text-slate-900')}>{showMoney ? money(account.current_balance) : '••••••'}</Text>
        <Text className="mt-1 text-sm text-slate-500">Opening {money(account.opening_balance)}</Text>
        <View className="mt-5 flex-row gap-3">
          <HeroStatTile icon={ArrowUpRight} label="Money in" value={showMoney ? money(inflow) : '••••'} valueTone="text-emerald-300 light:text-emerald-700" sub={`This month · ${thisMonthActivity.length} txns`} />
          <HeroStatTile icon={ArrowDownRight} label="Money out" value={showMoney ? money(outflow) : '••••'} valueTone="text-rose-300 light:text-rose-700" sub="This month" />
        </View>
      </View>

      <View className={tw('rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] p-5 glassy:glass-card')}>
        <Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>Net cash flow by month · last 6 months</Text>
        <View className="mt-4"><BarChart rows={months} valueKey="net" colorFor={(m) => (m.net < 0 ? '#fb7185' : '#34d399')} /></View>
      </View>

      <View className={tw('rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card')}>
        {selectMode ? (
          <View className={tw('flex-row items-center gap-2 border-b border-white/10 light:border-black/10 px-5 py-3')}>
            <Pressable onPress={exitSelectMode} className={tw('rounded-xl border border-white/10 light:border-black/10 p-2')}><Icon as={X} size={15} className="text-slate-400 light:text-slate-500" /></Pressable>
            <Text className={tw('flex-1 text-sm font-medium text-white light:text-slate-900')}>{selectedIds.size} selected</Text>
            <Pressable disabled={selectedIds.size === 0} onPress={async () => { if (await onDeleteTxBulk([...selectedIds])) exitSelectMode() }} className={tw('rounded-xl border border-rose-300/30 bg-rose-300/10 p-2', selectedIds.size === 0 && 'opacity-40')}><Icon as={Trash2} size={15} className="text-rose-300 light:text-rose-700" /></Pressable>
          </View>
        ) : (
          <View className={tw('flex-row items-center justify-between gap-3 border-b border-white/10 light:border-black/10 px-5 py-3')}>
            <Text className="text-xs uppercase tracking-widest text-slate-500">Account activity · {monthActivity.length}</Text>
            <MonthCursor cursor={monthCursor} onShift={shiftMonth} showAll={showAllMonths} onToggleAll={() => setShowAllMonths((v) => !v)} />
          </View>
        )}
        {monthActivity.length === 0 ? (
          <EmptyState compact icon={ArrowDownRight} title={showAllMonths ? 'No activity yet' : 'No activity this month'} message="Transactions on this account will show up here." />
        ) : monthActivity.map((t, i) => {
          const cat = categories.find((c) => c.id === t.category_id)
          const isIn = isInflow(t), isTransfer = t.type === 'transfer'
          const CatIcon = getTransactionIcon(t.description, cat?.name)
          const I = isTransfer ? ArrowLeftRight : CatIcon || (isIn ? ArrowUpRight : ArrowDownRight)
          return (
            <Pressable key={t.id} onPress={() => (selectMode ? toggleSelect(t.id) : onEditTx(t))} onLongPress={() => { if (!selectMode) { setSelectMode(true); toggleSelect(t.id) } }} delayLongPress={500}
              className={tw('flex-row items-center gap-3 px-5 py-3', i > 0 && 'border-t border-white/5 light:border-black/5')}>
              {selectMode ? (selectedIds.has(t.id) ? <Icon as={CheckCircle2} size={22} className="text-accent-400" /> : <View className={tw('h-[22px] w-[22px] rounded-full border-2 border-white/20 light:border-black/20')} />)
                : <View className="h-9 w-9 items-center justify-center rounded-xl bg-white/[.05] light:bg-black/[.035]"><I size={16} color={cat?.color || (isTransfer ? '#22d3ee' : '#94a3b8')} /></View>}
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center gap-1.5"><Text numberOfLines={1} className={tw('shrink text-sm font-medium text-white light:text-slate-900')}>{capitalizeFirst(t.description)}</Text>{isHiddenTx(t, hiddenGroups) ? <Icon as={Lock} size={11} className="text-slate-500" /> : null}</View>
                <Text numberOfLines={1} className="text-[11px] text-slate-500">{cat?.name || (isTransfer ? (t.transfer_direction === 'in' ? 'Transfer in' : 'Transfer out') : 'Uncategorised')} · {formatDateTime(t.date, t.time)}</Text>
              </View>
              <Text className={tw('text-sm font-semibold', isIn ? 'text-emerald-300 light:text-emerald-700' : isTransfer ? 'text-accent-300 light:text-accent-700' : 'text-rose-300 light:text-rose-700')}>{isIn ? '+' : '-'}{showMoney ? money(t.amount) : '••••'}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export function AccountsView({ data, onEdit, onDelete, onEditTx, onDeleteTxBulk, onSyncBalance, showMoney, onToggleMoney, onDetailChange }) {
  const { accounts, transactions, categories } = data
  const visibleAccounts = accounts.filter((a) => a.type !== 'debit_card')
  const debitCardFor = (accountId) => accounts.find((d) => d.type === 'debit_card' && d.linked_account_id === accountId)
  const [selectedAccountId, setSelectedAccountId] = useState(null)
  const selectedAccount = visibleAccounts.find((a) => a.id === selectedAccountId)
  useEffect(() => { onDetailChange?.(selectedAccountId) }, [selectedAccountId])

  if (selectedAccount) {
    return (
      <AccountDetailView account={selectedAccount} debitCard={selectedAccount.type === 'bank' ? debitCardFor(selectedAccount.id) : null} transactions={transactions} categories={categories}
        onBack={() => setSelectedAccountId(null)} onEdit={onEdit} onDelete={(a) => onDelete(a, () => setSelectedAccountId(null))} onEditTx={onEditTx} onDeleteTxBulk={onDeleteTxBulk}
        onSyncBalance={onSyncBalance} showMoney={showMoney} onToggleMoney={onToggleMoney} />
    )
  }

  const totalBalance = visibleAccounts.reduce((s, a) => s + Number(a.current_balance || 0), 0)
  const bankAccounts = visibleAccounts.filter((a) => a.type === 'bank')
  const cashAccounts = visibleAccounts.filter((a) => a.type === 'cash')
  const sum = (list) => list.reduce((s, a) => s + Number(a.current_balance || 0), 0)

  return (
    <View className="gap-5 pb-16">
      <View className="flex-row items-end justify-between gap-3">
        <View>
          <Text className={tw('mb-2 text-xs uppercase tracking-widest text-accent-200/70 light:text-accent-700')}>Where the money lives</Text>
          <Text className={tw('text-3xl font-semibold tracking-tight text-white light:text-slate-900')}>Accounts</Text>
        </View>
        <Pressable onPress={onToggleMoney} className={tw('rounded-xl border border-white/10 light:border-black/10 p-2.5')}><Icon as={showMoney ? Eye : EyeOff} size={16} className="text-slate-400 light:text-slate-500" /></Pressable>
      </View>

      {visibleAccounts.length > 0 && (
        <View className={tw('rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] p-6 glassy:glass-card')}>
          <Text className="text-xs uppercase tracking-widest text-slate-500">Total balance</Text>
          <Text className={tw('mt-1 text-[32px] font-semibold leading-[36px] text-white light:text-slate-900')}>{showMoney ? money(totalBalance) : '••••••••'}</Text>
          <Text className="mt-1 text-sm text-slate-500">{visibleAccounts.length} account{visibleAccounts.length === 1 ? '' : 's'}</Text>
          <View className="mt-5 flex-row gap-3">
            <HeroStatTile icon={Landmark} label="Bank" value={showMoney ? money(sum(bankAccounts)) : '••••'} sub={`${bankAccounts.length} account${bankAccounts.length === 1 ? '' : 's'}`} />
            <HeroStatTile icon={Wallet} label="Cash" value={showMoney ? money(sum(cashAccounts)) : '••••'} sub={`${cashAccounts.length} account${cashAccounts.length === 1 ? '' : 's'}`} />
          </View>
        </View>
      )}

      {visibleAccounts.length === 0 ? (
        <View className={tw('rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card')}>
          <EmptyState icon={Landmark} title="No accounts yet" message="Add a bank account or cash to start tracking balances." cta="Add account" onCta={() => onEdit(null)} />
        </View>
      ) : (
        <View className="gap-2">
          {visibleAccounts.map((a) => {
            const debitCard = a.type === 'bank' ? debitCardFor(a.id) : null
            const color = a.color || '#22d3ee'
            return (
              <Pressable key={a.id} onPress={() => setSelectedAccountId(a.id)} className={tw('flex-row items-center gap-3 rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] px-4 py-3.5 active:bg-white/[.05] glassy:glass-card')}>
                <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${color}22` }}>{a.type === 'cash' ? <Wallet size={18} color={color} /> : <Landmark size={18} color={color} />}</View>
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className={tw('text-sm font-semibold text-white light:text-slate-900')}>{a.name}</Text>
                  <Text numberOfLines={1} className="text-xs text-slate-500"><Text className="capitalize">{a.type.replace('_', ' ')}</Text>{a.bank_name ? ` · ${a.bank_name}` : ''}{a.account_number_last4 ? ` · •${a.account_number_last4}` : ''}{debitCard ? ' · card linked' : ''}</Text>
                </View>
                <Text className={tw('text-base font-semibold text-white light:text-slate-900')}>{showMoney ? money(a.current_balance) : '••••••'}</Text>
              </Pressable>
            )
          })}
        </View>
      )}
    </View>
  )
}
