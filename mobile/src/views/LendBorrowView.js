import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ArrowDownRight, ArrowUpRight, CheckCircle2, ChevronLeft, Eye, EyeOff, Heart, History, MoreVertical, Pencil, Plus, Trash2, User, UserPlus, X } from 'lucide-react-native'
import { Icon } from '../ui/Icon'
import { EmptyState } from '../ui/EmptyState'
import { HeroStatTile } from '../ui/HeroStatTile'
import { tw } from '../lib/tw'
import { capitalizeFirst, formatDate, money } from '../lib/format'
import { canDeleteRecord, canEditRecord, canLogRepayment, canManageShares, lendRole, perspectiveType } from '../lib/shared'

// Port of features/lend-borrow/LendBorrowView.jsx + LendBorrowDetailView.jsx (mobile layout).
const CARD = 'rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card'
const ICON_BTN = 'rounded-xl border border-white/10 light:border-black/10 p-2.5'

function Pill({ bg, fg, children }) {
  return <View className={tw('rounded-full px-2 py-0.5', bg)}><Text className={tw('text-[10px] uppercase tracking-widest', fg)}>{children}</Text></View>
}
const statusTone = (status, isClosedGray) => (status === 'returned' ? (isClosedGray ? ['bg-slate-500/15', 'text-slate-400 light:text-slate-500'] : ['bg-emerald-400/15', 'text-emerald-200 light:text-emerald-700']) : status === 'partial' ? ['bg-amber-400/15', 'text-amber-200 light:text-amber-700'] : ['bg-accent-400/15', 'text-accent-200 light:text-accent-700'])

export function LendBorrowView({ data, onAdd, onEdit, onDelete, onDeleteTx, onDeleteTxBulk, onLogRepayment, onAddMore, onEditAdditionNote, onManageAccess, showMoney, onToggleMoney, onDetailChange }) {
  const { lend_borrow = [], lend_repayments = [], lend_borrow_additions = [], accounts = [], transactions = [] } = data
  const now = new Date()
  const [showHistory, setShowHistory] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const selected = lend_borrow.find((l) => l.id === selectedId)
  useEffect(() => { onDetailChange?.(selected ? selectedId : null) }, [selectedId, !!selected])

  if (selected) {
    return (
      <LendBorrowDetailView record={selected} repayments={lend_repayments} additions={lend_borrow_additions} accounts={accounts} transactions={transactions}
        onBack={() => setSelectedId(null)} onEdit={onEdit} onDelete={(l) => onDelete(l, () => setSelectedId(null))} onDeleteTx={onDeleteTx} onDeleteTxBulk={onDeleteTxBulk}
        onLogRepayment={onLogRepayment} onAddMore={onAddMore} onEditAdditionNote={onEditAdditionNote} onManageAccess={onManageAccess} showMoney={showMoney} onToggleMoney={onToggleMoney} />
    )
  }

  const lent = lend_borrow.filter((l) => perspectiveType(l) === 'lent')
  const borrowed = lend_borrow.filter((l) => perspectiveType(l) === 'borrowed')
  const lentPending = lent.reduce((s, l) => s + Math.max(0, Number(l.amount) - Number(l.amount_repaid || 0)), 0)
  const borrowedPending = borrowed.reduce((s, l) => s + Math.max(0, Number(l.amount) - Number(l.amount_repaid || 0)), 0)
  const visible = showHistory ? lend_borrow : lend_borrow.filter((l) => l.status !== 'returned')
  const closedCount = lend_borrow.filter((l) => l.status === 'returned').length
  const net = lentPending - borrowedPending

  const card = (l) => {
    const isLent = perspectiveType(l) === 'lent'
    const isClosed = l.status === 'returned'
    const repaid = Number(l.amount_repaid || 0)
    const pending = Math.max(0, Number(l.amount) - repaid)
    const pct = Number(l.amount) > 0 ? Math.min(100, Math.round((repaid / Number(l.amount)) * 100)) : 0
    const overdue = l.due_date && !isClosed && new Date(l.due_date) < now
    const acc = accounts.find((a) => a.id === l.from_account_id)
    const [sbg, sfg] = statusTone(l.status, true)
    return (
      <Pressable key={l.id} onPress={() => setSelectedId(l.id)}
        className={tw('rounded-2xl border p-5 active:opacity-80', isClosed ? 'border-white/5 light:border-black/5 bg-white/[.02] light:bg-black/[.02]' : isLent ? 'border-emerald-400/10 bg-emerald-500/[.03]' : 'border-rose-400/10 bg-rose-500/[.03]')}>
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className={tw('text-base font-semibold text-white light:text-slate-900')}>{capitalizeFirst(l.person_name)}</Text>
          <Pill bg={isClosed ? 'bg-slate-500/15' : isLent ? 'bg-emerald-400/15' : 'bg-rose-400/15'} fg={isClosed ? 'text-slate-400 light:text-slate-500' : isLent ? 'text-emerald-200 light:text-emerald-700' : 'text-rose-200 light:text-rose-700'}>{isLent ? 'lent' : 'borrowed'}</Pill>
          <Pill bg={sbg} fg={sfg}>{l.status}</Pill>
          {overdue ? <Pill bg="bg-rose-400/15" fg="text-rose-200 light:text-rose-700">overdue</Pill> : null}
        </View>
        <Text className="mt-1 text-xs text-slate-500">{capitalizeFirst(l.reason) || (isLent ? 'Lent' : 'Borrowed')} · {formatDate(l.date)}{acc ? ` · ${acc.name}` : ''}{l.due_date ? ` · due ${formatDate(l.due_date)}` : ''}</Text>
        <View className="mt-4 flex-row items-end justify-between">
          <View>
            <Text className="text-xs text-slate-500">{isLent ? 'They still owe you' : 'You still owe'}</Text>
            <Text className={tw('text-2xl font-semibold', isClosed ? 'text-slate-300 light:text-slate-700' : 'text-white light:text-slate-900')}>{showMoney ? money(pending) : '••••'}</Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-slate-500">of {showMoney ? money(l.amount) : '••••'}</Text>
            <Text className={tw('text-[11px]', isClosed ? 'text-slate-500' : isLent ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700')}>{isLent ? '+' : '-'}{money(repaid)} {isLent ? 'repaid to you' : 'paid by you'}</Text>
          </View>
        </View>
        <View className={tw('mt-3 h-2 overflow-hidden rounded-full bg-white/5 light:bg-black/5')}>
          <View className={tw('h-full rounded-full', isClosed ? 'bg-slate-500' : isLent ? 'bg-emerald-400' : 'bg-rose-400')} style={{ width: `${pct}%` }} />
        </View>
      </Pressable>
    )
  }

  return (
    <View className="gap-5 pb-8">
      <View>
        <Text className={tw('mb-2 text-xs uppercase tracking-widest text-accent-200/70 light:text-accent-700')}>Money between people</Text>
        <Text className={tw('text-3xl font-semibold tracking-tight text-white light:text-slate-900')}>Lend & borrow</Text>
      </View>
      <View className="flex-row gap-2">
        <Pressable onPress={() => setShowHistory((v) => !v)} className={tw('flex-1 flex-row items-center justify-center gap-2 rounded-xl border px-4 py-2.5', showHistory ? 'border-accent-300/50 bg-accent-400/10' : 'border-white/10 light:border-black/10')}>
          <Icon as={History} size={15} className={showHistory ? 'text-accent-200 light:text-accent-700' : 'text-slate-400 light:text-slate-500'} />
          <Text className={tw('text-sm font-semibold', showHistory ? 'text-accent-200 light:text-accent-700' : 'text-slate-400 light:text-slate-500')}>{showHistory ? 'Hide settled' : 'View all history'}</Text>
        </Pressable>
        <Pressable onPress={onToggleMoney} className={tw(ICON_BTN)}><Icon as={showMoney ? Eye : EyeOff} size={16} className={tw('text-slate-400 light:text-slate-500')} /></Pressable>
      </View>

      {lend_borrow.length > 0 && (
        <View className={tw('rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] p-6 glassy:glass-card')}>
          <Text className="text-xs uppercase tracking-widest text-slate-500">{net >= 0 ? 'Net owed to you' : 'Net you owe'}</Text>
          <Text className={tw('mt-1 text-[32px] font-semibold leading-[36px] text-white light:text-slate-900')}>{showMoney ? money(Math.abs(net)) : '••••••'}</Text>
          <View className="mt-5 flex-row gap-3">
            <HeroStatTile label="Total lent (pending)" value={showMoney ? money(lentPending) : '••••'} valueTone="text-emerald-300 light:text-emerald-700" sub={`${lent.length} people`} />
            <HeroStatTile label="Total borrowed (pending)" value={showMoney ? money(borrowedPending) : '••••'} valueTone="text-rose-300 light:text-rose-700" sub={`${borrowed.length} people`} />
          </View>
        </View>
      )}

      {lend_borrow.length === 0 ? (
        <View className={tw(CARD)}><EmptyState icon={Heart} title="Nothing to track" message="Log money you've lent to friends or borrowed from someone." cta="Add first record" onCta={onAdd} /></View>
      ) : visible.length === 0 ? (
        <View className={tw(CARD)}><EmptyState icon={Heart} title="All settled" message={`${closedCount} record${closedCount === 1 ? '' : 's'} fully repaid. Tap "View all history" to see them.`} /></View>
      ) : (
        <View className="gap-4">{visible.map(card)}</View>
      )}
    </View>
  )
}

function LendBorrowDetailView({ record, repayments, additions, accounts, transactions, onBack, onEdit, onDelete, onDeleteTx, onDeleteTxBulk, onLogRepayment, onAddMore, onEditAdditionNote, onManageAccess, showMoney, onToggleMoney }) {
  const role = lendRole(record)
  const isLent = perspectiveType(record) === 'lent'
  const isSettled = record.status === 'returned'
  const repaid = Number(record.amount_repaid || 0)
  const pending = Math.max(0, Number(record.amount) - repaid)
  const pct = Number(record.amount) > 0 ? Math.min(100, Math.round((repaid / Number(record.amount)) * 100)) : 0
  const overdue = record.due_date && !isSettled && new Date(record.due_date) < new Date()
  const account = accounts.find((a) => a.id === record.from_account_id) || record.linked_account
  const paymentsForThis = repayments.filter((r) => r.lend_borrow_id === record.id).sort((a, b) => new Date(b.date) - new Date(a.date))
  const additionsForThis = additions.filter((a) => a.lend_borrow_id === record.id).sort((a, b) => new Date(b.date) - new Date(a.date))
  const [moreOpen, setMoreOpen] = useState(false)
  const [selectSection, setSelectSection] = useState(null)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const toggleSelect = (id) => setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  const startSelect = (section, id) => { if (!canLogRepayment(role) || selectSection) return; setSelectSection(section); toggleSelect(id) }
  const exitSelectMode = () => { setSelectSection(null); setSelectedIds(new Set()) }
  const handleBulkDelete = async (section) => {
    const list = section === 'payments' ? paymentsForThis : additionsForThis
    const txIds = [...selectedIds].map((rid) => list.find((r) => r.id === rid)).filter(Boolean).map((r) => transactions.find((t) => t.id === r.linked_transaction_id)?.id).filter(Boolean)
    if (txIds.length === 0) return
    if (await onDeleteTxBulk(txIds)) exitSelectMode()
  }
  const [sbg, sfg] = statusTone(record.status, false)
  const amountColor = isLent ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700'
  const menuItem = 'flex-row items-center gap-2 rounded-lg px-3 py-2'
  const menuText = tw('text-sm text-slate-300 light:text-slate-700')
  const hasMenu = canManageShares(role) || canEditRecord(role) || canDeleteRecord(role)

  const selectHeader = (section, label, count) => (selectSection === section ? (
    <View className={tw('flex-row items-center gap-2 border-b border-white/10 light:border-black/10 px-5 py-3')}>
      <Pressable onPress={exitSelectMode} className={tw('rounded-xl border border-white/10 light:border-black/10 p-2')}><Icon as={X} size={15} className={tw('text-slate-400 light:text-slate-500')} /></Pressable>
      <Text className={tw('flex-1 text-sm font-medium text-white light:text-slate-900')}>{selectedIds.size} selected</Text>
      <Pressable disabled={selectedIds.size === 0} onPress={() => handleBulkDelete(section)} className={tw('rounded-xl border border-rose-300/30 bg-rose-300/10 p-2', selectedIds.size === 0 && 'opacity-40')}><Icon as={Trash2} size={15} className={tw('text-rose-300 light:text-rose-700')} /></Pressable>
    </View>
  ) : (
    <View className={tw('border-b border-white/10 light:border-black/10 px-5 py-3')}><Text className="text-xs uppercase tracking-widest text-slate-500">{label} · {count}</Text></View>
  ))
  const selectMark = (id, fallback) => (selectedIds.has(id)
    ? <Icon as={CheckCircle2} size={22} className="text-accent-400" />
    : selectSection ? <View className={tw('h-[22px] w-[22px] rounded-full border-2 border-white/20 light:border-black/20')} /> : fallback)

  return (
    <View className="gap-5 pb-8">
      <Pressable onPress={onBack} className="flex-row items-center gap-1.5"><Icon as={ChevronLeft} size={14} className={tw('text-slate-400 light:text-slate-500')} /><Text className={tw('text-sm text-slate-400 light:text-slate-500')}>Back to lend & borrow</Text></Pressable>

      <View className="z-20 flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <View className={tw('h-14 w-14 items-center justify-center rounded-2xl', isLent ? 'bg-emerald-400/15' : 'bg-rose-400/15')}><Icon as={User} size={22} className={isLent ? 'text-emerald-200 light:text-emerald-700' : 'text-rose-200 light:text-rose-700'} /></View>
          <View className="min-w-0 flex-1">
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className={tw('text-lg font-semibold text-white light:text-slate-900')}>{capitalizeFirst(record.person_name)}</Text>
              <Pill bg={isLent ? 'bg-emerald-400/15' : 'bg-rose-400/15'} fg={amountColor.replace('300', '200')}>{isLent ? 'lent' : 'borrowed'}</Pill>
              <Pill bg={sbg} fg={sfg}>{record.status}</Pill>
              {overdue ? <Pill bg="bg-rose-400/15" fg="text-rose-200 light:text-rose-700">overdue</Pill> : null}
            </View>
            <Text className="mt-1 text-xs text-slate-500">{capitalizeFirst(record.reason) || (isLent ? 'Lent' : 'Borrowed')} · {formatDate(record.date)}{account ? ` · ${account.name}` : ''}{record.due_date ? ` · due ${formatDate(record.due_date)}` : ''}</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable onPress={onToggleMoney} className={tw(ICON_BTN)}><Icon as={showMoney ? Eye : EyeOff} size={16} className={tw('text-slate-400 light:text-slate-500')} /></Pressable>
          {hasMenu && (
            <View className="relative">
              <Pressable onPress={() => setMoreOpen((o) => !o)} className={tw('rounded-xl border p-2.5', moreOpen ? 'border-accent-300/40 bg-accent-400/10' : 'border-white/10 light:border-black/10')}><Icon as={MoreVertical} size={16} className={moreOpen ? 'text-accent-200 light:text-accent-700' : 'text-slate-400 light:text-slate-500'} /></Pressable>
              {moreOpen && (
                <View className={tw('absolute right-0 top-12 z-30 w-56 rounded-xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-1')}>
                  {canManageShares(role) && <Pressable onPress={() => { setMoreOpen(false); onManageAccess(record) }} className={menuItem}><Icon as={UserPlus} size={14} className={tw('text-slate-300 light:text-slate-700')} /><Text className={menuText}>Manage access</Text></Pressable>}
                  {canEditRecord(role) && <Pressable onPress={() => { setMoreOpen(false); onEdit(record) }} className={menuItem}><Icon as={Pencil} size={14} className={tw('text-slate-300 light:text-slate-700')} /><Text className={menuText}>Edit record</Text></Pressable>}
                  {canDeleteRecord(role) && <Pressable onPress={() => { setMoreOpen(false); onDelete(record) }} className={menuItem}><Icon as={Trash2} size={14} className={tw('text-rose-300/70 light:text-rose-700')} /><Text className={tw('text-sm text-rose-300/70 light:text-rose-700')}>Delete record</Text></Pressable>}
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {canLogRepayment(role) && (
        <Pressable onPress={() => onAddMore(record)} className={tw('self-start rounded-xl border border-white/10 light:border-black/10 px-4 py-2.5')}>
          <Text className={tw('text-sm font-semibold text-slate-200 light:text-slate-800')}>+ {isLent ? 'Lend' : 'Borrow'} more</Text>
        </Pressable>
      )}

      <View className={tw('rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] p-6 glassy:glass-card')}>
        <Text className="text-xs uppercase tracking-widest text-slate-500">{isLent ? 'They still owe you' : 'You still owe'}</Text>
        <Text className={tw('mt-1 text-[32px] font-semibold leading-[36px] text-white light:text-slate-900')}>{showMoney ? money(pending) : '••••'}</Text>
        <Text className="mt-1 text-sm text-slate-500">of {money(record.amount)} total</Text>
        <View className={tw('mt-4 h-2 overflow-hidden rounded-full bg-white/5 light:bg-black/5')}><View className={tw('h-full rounded-full', isLent ? 'bg-emerald-400' : 'bg-rose-400')} style={{ width: `${pct}%` }} /></View>
        <View className="mt-5 flex-row gap-3">
          <HeroStatTile label={isLent ? 'Repaid to you' : 'Paid by you'} value={showMoney ? money(repaid) : '••••'} valueTone="text-accent-300 light:text-accent-700" sub={`${paymentsForThis.length} payment${paymentsForThis.length === 1 ? '' : 's'}`} />
          <HeroStatTile label="Settled" value={`${pct}%`} valueTone={pct >= 100 ? 'text-emerald-300 light:text-emerald-700' : pct > 0 ? 'text-amber-300 light:text-amber-700' : 'text-slate-400 light:text-slate-500'} sub={pct >= 100 ? 'Fully settled' : 'In progress'} />
        </View>
      </View>

      <View className={tw(CARD)}>
        {selectHeader('payments', isLent ? 'Repayments received' : 'Payments made', paymentsForThis.length)}
        {paymentsForThis.length === 0 ? (
          <EmptyState compact icon={isLent ? ArrowDownRight : ArrowUpRight} title="No payments yet" message={isSettled ? 'This record is fully settled.' : `Log it here when ${isLent ? 'they repay you' : 'you make a payment'}.`}
            cta={isSettled || !canLogRepayment(role) ? undefined : `Log ${isLent ? 'repayment' : 'payment'}`} onCta={isSettled || !canLogRepayment(role) ? undefined : () => onLogRepayment(record)} />
        ) : paymentsForThis.map((r, i) => {
          const acc = accounts.find((a) => a.id === r.account_id)
          return (
            <Pressable key={r.id} onPress={() => { if (selectSection === 'payments') toggleSelect(r.id) }} onLongPress={() => startSelect('payments', r.id)} delayLongPress={500}
              className={tw('flex-row items-center gap-3 px-5 py-3', i > 0 && 'border-t border-white/5 light:border-black/5')}>
              {selectSection === 'payments' ? selectMark(r.id) : (
                <View className={tw('h-9 w-9 items-center justify-center rounded-xl bg-white/[.05] light:bg-black/[.035]')}><Icon as={isLent ? ArrowDownRight : ArrowUpRight} size={16} className={amountColor} /></View>
              )}
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className={tw('text-sm font-medium text-white light:text-slate-900')}>Payment #{paymentsForThis.length - i}</Text>
                <Text numberOfLines={1} className="text-[11px] text-slate-500">{formatDate(r.date)}{acc ? ` · ${acc.name}` : ''}</Text>
              </View>
              <Text className={tw('text-sm font-semibold', amountColor)}>{isLent ? '+' : '-'}{showMoney ? money(r.amount) : '••••'}</Text>
            </Pressable>
          )
        })}
      </View>

      <View className={tw(CARD)}>
        {selectHeader('additions', isLent ? 'More lent' : 'More borrowed', additionsForThis.length)}
        {additionsForThis.length === 0 ? (
          <EmptyState compact icon={Plus} title="No top-ups yet" message={`Log it here if you ${isLent ? 'lend them' : 'borrow'} more later.`}
            cta={!canLogRepayment(role) ? undefined : `${isLent ? 'Lend' : 'Borrow'} more`} onCta={!canLogRepayment(role) ? undefined : () => onAddMore(record)} />
        ) : additionsForThis.map((a, i) => {
          const acc = accounts.find((x) => x.id === a.account_id)
          return (
            <Pressable key={a.id} onPress={() => { if (selectSection === 'additions') toggleSelect(a.id); else if (canLogRepayment(role)) onEditAdditionNote?.(a) }} onLongPress={() => startSelect('additions', a.id)} delayLongPress={500}
              className={tw('flex-row items-center gap-3 px-5 py-3', i > 0 && 'border-t border-white/5 light:border-black/5')}>
              {selectSection === 'additions' ? selectMark(a.id) : (
                <View className={tw('h-9 w-9 items-center justify-center rounded-xl bg-white/[.05] light:bg-black/[.035]')}><Icon as={Plus} size={16} className={tw('text-amber-300 light:text-amber-700')} /></View>
              )}
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className={tw('text-sm font-medium text-white light:text-slate-900')}>{a.notes ? capitalizeFirst(a.notes) : `Top-up #${additionsForThis.length - i}`}</Text>
                <Text numberOfLines={1} className="text-[11px] text-slate-500">{formatDate(a.date)}{acc ? ` · ${acc.name}` : ''}</Text>
              </View>
              <Text className={tw('text-sm font-semibold text-amber-300 light:text-amber-700')}>+{showMoney ? money(a.amount) : '••••'}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
