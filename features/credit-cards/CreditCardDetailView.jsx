'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, Eye, EyeOff, MoreVertical, Pencil, RefreshCw, Target, Trash2, X } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BankCardFace } from '@/components/shared/BankCardFace'
import { StatCard } from '@/components/shared/StatCard'
import { HeroStatTile } from '@/components/shared/HeroStatTile'
import { EmptyState } from '@/components/shared/EmptyState'
import { MonthCursor } from '@/components/shared/MonthCursor'
import { currentSpendingCycle, nextBillDue, utilisationSeverity } from '@/lib/creditCards'
import { capitalizeFirst, dateToLocalISO, formatDate, formatDateTime, money, monthName, ordinal } from '@/lib/format'

// Bill payments are logged through /finance/credit_cards/:id/pay_bill, which creates a plain
// transaction with a fixed, app-generated description rather than a linked_module reference —
// matching on that description is how "repayment history" finds them among all transactions.
const billPaymentDescription = (card) => `Credit card bill · ${card.name}`

// A card's outstanding balance is affected by charges from two different places: the dedicated
// "Log spend" flow (credit_card_transactions) AND anything paid using this card as a funding
// source elsewhere in the app — a loan EMI, a lend, or a regular expense with this card picked
// as the account (all land in the main transactions table, linked via linked_module). Showing
// only the first source undercounts real activity, which is exactly what looked "not matching"
// against the outstanding balance.
function buildActivity(card, cardTransactions, allTransactions) {
  const fromLog = cardTransactions.map((t) => ({
    id: t.id, date: t.date, time: t.time, description: t.description, amount: Number(t.amount || 0),
    categoryId: t.category_id, direction: 'debit', status: t.status, source: 'log', row: t,
  }))
  const fromLinked = allTransactions
    .filter((t) => t.linked_module === 'credit_card' && t.linked_module_id === card.id)
    .map((t) => ({
      id: t.id, date: t.date, time: t.time, description: t.description, amount: Number(t.amount || 0),
      categoryId: t.category_id, direction: t.type === 'income' ? 'credit' : 'debit', status: null, source: 'linked', row: t,
    }))
  return [...fromLog, ...fromLinked].sort((a, b) => new Date(b.date) - new Date(a.date) || String(b.time || '').localeCompare(String(a.time || '')))
}

export function CreditCardDetailView({ card, cardTransactions, allTransactions, categories, onBack, onSpend, onPay, onDeleteSpend, onDeleteTx, onEditTx, onDeleteActivityBulk, onDeleteTxBulk, onSyncOutstanding, onEdit, onDelete, showMoney, onToggleMoney }) {
  const [syncOpen, setSyncOpen] = useState(false)
  const [syncValue, setSyncValue] = useState('')
  const [syncBusy, setSyncBusy] = useState(false)
  const util = Number(card.credit_limit) > 0 ? Math.min(100, Math.round((Number(card.current_outstanding) / Number(card.credit_limit)) * 100)) : 0
  const activity = buildActivity(card, cardTransactions, allTransactions)
  const nd = nextBillDue(card)

  const [monthCursor, setMonthCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } })
  const [showAllMonths, setShowAllMonths] = useState(false)
  const [cycleMode, setCycleMode] = useState(false)
  // 0 = current cycle, -1 = one cycle back, etc. — never > 0, there's no future cycle to view.
  // Cycles are calendar-month-long, so shifting the reference date by whole months lands exactly
  // on the previous/next cycle (currentSpendingCycle finds whichever cycle contains that date).
  const [cycleOffset, setCycleOffset] = useState(0)
  const shiftMonth = (delta) => { setShowAllMonths(false); setMonthCursor((c) => { const d = new Date(c.year, c.month + delta, 1); return { year: d.getFullYear(), month: d.getMonth() } }) }
  const monthActivity = showAllMonths ? activity : activity.filter((a) => {
    const d = new Date(a.date)
    return d.getFullYear() === monthCursor.year && d.getMonth() === monthCursor.month
  })
  const cycleRefDate = (() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth() + cycleOffset, n.getDate()) })()
  const cycle = currentSpendingCycle(card, cycleRefDate)
  const cycleActivity = activity.filter((a) => { const d = new Date(a.date); return d >= cycle.start && d < cycle.end })
  const displayedActivity = cycleMode ? cycleActivity : monthActivity
  // Net spend (debits minus credits) for whatever's currently displayed — same netting
  // "Net spend by month" already does below — plus a yours/to-be-repaid split of the debit side.
  const displayedDebits = displayedActivity.filter((a) => a.direction === 'debit')
  const displayedTotal = displayedActivity.reduce((s, a) => s + (a.direction === 'debit' ? a.amount : -a.amount), 0)
  const reimbursableTotal = displayedDebits.filter((a) => a.row?.is_reimbursable).reduce((s, a) => s + a.amount, 0)
  const ownTotal = displayedDebits.reduce((s, a) => s + a.amount, 0) - reimbursableTotal

  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: monthName(d), spend: 0, count: 0 })
  }
  activity.forEach((a) => {
    const d = new Date(a.date)
    const bucket = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`)
    if (bucket) { bucket.spend += a.direction === 'debit' ? a.amount : -a.amount; bucket.count++ }
  })

  const repayments = allTransactions
    .filter((t) => t.type === 'expense' && t.description === billPaymentDescription(card))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  const totalRepaid = repayments.reduce((s, t) => s + Number(t.amount || 0), 0)

  const deleteActivity = (a) => (a.source === 'log' ? onDeleteSpend(a.row) : onDeleteTx(a.row))

  // Mobile: long-press a row to enter multi-select (same pattern as the main ledger/Accounts),
  // instead of the old long-press-deletes-immediately behavior. `selectSection` names which of
  // the two lists (activity/repayments) is selecting, same one-at-a-time reasoning as the
  // Lend/Borrow detail view's two lists.
  const [selectSection, setSelectSection] = useState(null)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const longPressTimer = useRef(null)
  const longPressFired = useRef(false)
  const LONG_PRESS_MS = 500
  const cancelLongPress = () => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null } }
  const toggleSelect = (id) => setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  const startLongPress = (section, id) => {
    longPressFired.current = false
    cancelLongPress()
    longPressTimer.current = setTimeout(() => { longPressFired.current = true; setSelectSection(section); toggleSelect(id) }, LONG_PRESS_MS)
  }
  const exitSelectMode = () => { setSelectSection(null); setSelectedIds(new Set()) }
  const handleRowTap = (section, id) => {
    if (longPressFired.current) { longPressFired.current = false; return }
    if (selectSection === section) toggleSelect(id)
  }
  // Only a 'linked' activity row is a real transactions row that the shared edit form knows how
  // to open — a 'log' row (the legacy credit_card_transactions table) has no edit path anywhere
  // in the app today, so a tap on one of those outside select mode stays a no-op, same as before.
  const handleActivityTap = (a) => {
    if (longPressFired.current) { longPressFired.current = false; return }
    if (selectSection === 'activity') { toggleSelect(a.id); return }
    if (a.source === 'linked') onEditTx?.(a.row)
  }
  // "Card activity" mixes two sources (log spends vs. this-card-linked transactions, see
  // buildActivity above) — onDeleteActivityBulk splits the selection by source itself, so this
  // just hands it the full activity rows for whatever got selected.
  const handleActivityBulkDelete = async () => {
    const rows = displayedActivity.filter((a) => selectedIds.has(a.id))
    const didDelete = await onDeleteActivityBulk(rows)
    if (didDelete) exitSelectMode()
  }
  const handleRepaymentsBulkDelete = async () => {
    const didDelete = await onDeleteTxBulk([...selectedIds])
    if (didDelete) exitSelectMode()
  }

  // Mobile: Edit/Delete collapse into this "..." menu, same pattern as the other detail views —
  // the eye toggle stays outside it, always visible. Desktop is unchanged.
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef(null)
  useEffect(() => {
    const onDocClick = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 light:text-slate-500 hover:text-white hover:light:text-slate-900"><ChevronRight size={14} className="rotate-180" /> Back to credit cards</button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="w-72 sm:w-80">
          <BankCardFace name={card.name} subtitle={card.bank || 'Credit card'} last4={card.last4} color={card.color || '#a78bfa'} />
        </div>
        <div className="flex w-full min-w-0 flex-wrap justify-end gap-2 sm:w-auto">
          <button onClick={() => onSpend(card)} className="hidden rounded-xl bg-white/[.06] light:bg-black/[.04] px-4 py-2.5 text-sm font-semibold text-white light:text-slate-900 hover:bg-white/[.1] hover:light:bg-black/[.06] lg:inline-block">+ Log spend</button>
          <button onClick={() => onPay(card)} disabled={Number(card.current_outstanding) <= 0} className="rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-4 py-2.5 text-sm font-semibold text-[#07101c] disabled:opacity-50">Pay bill</button>
          {/* Mobile: Edit/Delete collapse into this "..." menu; eye toggle stays outside it,
              always visible — row reads Pay bill, eye, "...", right-aligned, "..." rightmost. */}
          <div className="flex items-center gap-2 sm:hidden">
            <button onClick={onToggleMoney} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
              {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <div ref={moreRef} className="relative">
              <button type="button" onClick={() => setMoreOpen((o) => !o)} className={`rounded-xl border p-2.5 transition ${moreOpen ? 'border-accent-300/40 bg-accent-400/10 text-accent-200 light:text-accent-700' : 'border-white/10 light:border-black/10 text-slate-400 light:text-slate-500 hover:bg-white/5'}`} title="More options">
                <MoreVertical size={16} />
              </button>
              {moreOpen && (
                <div className="absolute right-0 z-30 mt-2 w-48 rounded-xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-1 shadow-2xl">
                  <button type="button" onClick={() => { setMoreOpen(false); setSyncOpen((o) => !o) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5"><RefreshCw size={14} />Sync outstanding</button>
                  <button type="button" onClick={() => { setMoreOpen(false); onEdit(card) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5"><Pencil size={14} />Edit card</button>
                  <button type="button" onClick={() => { setMoreOpen(false); onDelete(card) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={14} />Delete card</button>
                </div>
              )}
            </div>
          </div>
          {/* Desktop: unchanged, everything stays inline */}
          <div className="hidden sm:contents">
            <button onClick={() => setSyncOpen((o) => !o)} className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${syncOpen ? 'border-accent-300/40 bg-accent-400/10 text-accent-200 light:text-accent-700' : 'border-white/10 light:border-black/10 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900'}`}><RefreshCw size={15} /><span className="hidden sm:inline">Sync</span></button>
            <button onClick={() => onEdit(card)} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900"><Pencil size={15} /></button>
            <button onClick={() => onDelete(card)} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={15} /></button>
            <button onClick={onToggleMoney} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
              {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
        </div>
      </div>

      {syncOpen && (
        <div className="rounded-xl border border-accent-300/20 bg-accent-400/[.03] p-4">
          <div className="text-sm text-slate-300 light:text-slate-700">Sync with your card's real statement</div>
          <div className="mt-1 text-[11px] text-slate-500">
            Outstanding isn't summed from transactions the way an account balance is — it's adjusted piecemeal by every spend, payment, and repayment. If it's ever drifted from what your card actually shows, enter the real number here to set it directly (no adjustment transaction, since there's nothing to log — just correcting a number).
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input type="number" step="0.01" value={syncValue} onChange={(e) => setSyncValue(e.target.value)} placeholder={String(Math.round(card.current_outstanding))} className="w-40 rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-2 text-sm text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
            <button
              type="button"
              disabled={syncBusy || !syncValue}
              onClick={async () => {
                setSyncBusy(true)
                await onSyncOutstanding(card, Number(syncValue))
                setSyncBusy(false); setSyncOpen(false); setSyncValue('')
              }}
              className="rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-4 py-2 text-sm font-semibold text-[#07101c] disabled:opacity-50"
            >{syncBusy ? 'Syncing…' : 'Sync'}</button>
            {syncValue && (
              <span className="text-[11px] text-slate-500">
                {Number(syncValue) < Number(card.current_outstanding) ? `${money(Number(card.current_outstanding) - Number(syncValue))} lower than tracked` : Number(syncValue) > Number(card.current_outstanding) ? `${money(Number(syncValue) - Number(card.current_outstanding))} higher than tracked` : 'Matches already'}
              </span>
            )}
          </div>
        </div>
      )}

      <div className={`rounded-xl border px-4 py-3 text-sm ${nd.days <= 4 ? 'border-amber-300/30 bg-amber-300/5 text-amber-200 light:text-amber-700' : 'border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] glassy:glass-card text-slate-300 light:text-slate-700'}`}>
        Bill on the {ordinal(card.billing_date)} · Due {nd.days > 0 ? `in ${nd.days} day${nd.days === 1 ? '' : 's'}` : nd.days === 0 ? 'today' : 'overdue'} ({formatDate(dateToLocalISO(nd.due))})
      </div>

      {/* Mobile: Outstanding as the headline hero figure, Utilisation/Total repaid as a 2-col
          row below it — same hero-card shape as Accounts/Loans/Scholarships/Lend-borrow detail
          views. Desktop keeps the original 3-up StatCard grid, unchanged. */}
      <div className="rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] glassy:glass-card p-6 sm:hidden">
        <div className="text-xs uppercase tracking-widest text-slate-500">Outstanding</div>
        <div className="mt-1 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[1.1] tracking-[-0.01em] text-rose-300 light:text-rose-700">{showMoney ? money(card.current_outstanding) : '••••••'}</div>
        <div className="mt-1 text-sm text-slate-500">of {money(card.credit_limit)} limit</div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <HeroStatTile icon={Target} label="Utilisation" value={`${util}%`} valueTone={utilisationSeverity(util).tone} sub={utilisationSeverity(util).label} />
          <HeroStatTile icon={ArrowUpRight} label="Total repaid" value={showMoney ? money(totalRepaid) : '••••'} valueTone="text-emerald-300 light:text-emerald-700" sub={`${repayments.length} payment${repayments.length === 1 ? '' : 's'}`} />
        </div>
      </div>
      <div className="hidden gap-4 sm:grid sm:grid-cols-3">
        <StatCard label="Outstanding" value={showMoney ? money(card.current_outstanding) : '••••'} icon={ArrowDownRight} accent="bg-rose-400/15 text-rose-200 light:text-rose-700" tone="text-rose-300 light:text-rose-700" sub={<span>of {money(card.credit_limit)} limit</span>} />
        <StatCard label="Utilisation" value={`${util}%`} icon={Target} accent="bg-accent-400/15 text-accent-200 light:text-accent-700" tone={utilisationSeverity(util).tone} sub={<span>{utilisationSeverity(util).label}</span>} />
        <StatCard label="Total repaid" value={showMoney ? money(totalRepaid) : '••••'} icon={ArrowUpRight} accent="bg-emerald-400/15 text-emerald-200 light:text-emerald-700" sub={<span>{repayments.length} payment{repayments.length === 1 ? '' : 's'}</span>} />
      </div>

      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-5">
        <div className="text-sm font-semibold text-white light:text-slate-900">Net spend by month · last 6 months</div>
        <div className="mt-4 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={months}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff11" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip cursor={{ fill: '#ffffff08' }} contentStyle={{ background: '#0f1420', border: '1px solid #ffffff22', borderRadius: 12, color: '#fff' }} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} formatter={(v) => money(v)} />
              {/* A fixed, always-readable palette instead of the card's own accent colour —
                  that colour is user-picked and can be dark enough to nearly vanish against
                  this chart's dark background. Rose for a net-spend month, emerald for a rare
                  net-credit one (refunds outweighing charges), matching the expense/income
                  colours used in every other chart in the app. */}
              <Bar dataKey="spend" radius={[6, 6, 0, 0]} maxBarSize={28}>
                {months.map((m, i) => (
                  <Cell key={i} fill={m.spend < 0 ? '#34d399' : '#fb7185'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card">
        {selectSection === 'activity' ? (
          <div className="flex items-center gap-2 border-b border-white/10 light:border-black/10 px-5 py-3 sm:hidden">
            <button type="button" onClick={exitSelectMode} className="shrink-0 rounded-xl border border-white/10 light:border-black/10 p-2 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900" title="Cancel selection"><X size={15} /></button>
            <div className="flex-1 text-sm font-medium text-white light:text-slate-900">{selectedIds.size} selected</div>
            <button type="button" disabled={selectedIds.size === 0} onClick={handleActivityBulkDelete} className="shrink-0 rounded-xl border border-rose-300/30 bg-rose-300/10 p-2 text-rose-300 light:text-rose-700 hover:bg-rose-300/20 disabled:opacity-40 disabled:pointer-events-none" title="Delete selected"><Trash2 size={15} /></button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 light:border-black/10 px-5 py-3">
            <div className="text-xs uppercase tracking-widest text-slate-500">
              Card activity · {displayedActivity.length}
              {cycleMode && <span className="normal-case tracking-normal text-slate-600"> · {formatDate(dateToLocalISO(cycle.start))} – {formatDate(dateToLocalISO(cycle.end))}</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCycleMode((v) => !v)}
                title={`Spends since the ${ordinal(card.billing_date)} (this cycle's bill)`}
                className={`rounded-xl border px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition ${cycleMode ? 'border-accent-300/40 bg-accent-400/15 text-accent-200 light:text-accent-700' : 'border-white/10 light:border-black/10 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900'}`}
              >This billing cycle</button>
              {cycleMode ? (
                <div className="flex items-center rounded-xl border border-white/10 light:border-black/10">
                  <button type="button" onClick={() => setCycleOffset((o) => o - 1)} className="rounded-l-xl p-2 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900" title="Previous cycle"><ChevronLeft size={14} /></button>
                  <span className="px-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300 light:text-slate-700">{cycleOffset === 0 ? 'Current' : `${Math.abs(cycleOffset)} back`}</span>
                  <button type="button" disabled={cycleOffset >= 0} onClick={() => setCycleOffset((o) => Math.min(0, o + 1))} className="rounded-r-xl p-2 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900 disabled:opacity-30 disabled:pointer-events-none" title="Next cycle"><ChevronRight size={14} /></button>
                </div>
              ) : (
                <MonthCursor cursor={monthCursor} onShift={shiftMonth} showAll={showAllMonths} onToggleAll={() => setShowAllMonths((v) => !v)} />
              )}
            </div>
          </div>
        )}
        {displayedActivity.length === 0 ? (
          <EmptyState compact icon={ArrowDownRight} title={cycleMode ? 'No activity this billing cycle' : showAllMonths ? 'No activity yet' : 'No activity this month'} message="Log a spend, or pay for something with this card, to see it here." cta="Log spend" onCta={() => onSpend(card)} />
        ) : (
          <>
            <div className="hidden grid-cols-[1.4fr_.9fr_.6fr_.6fr_auto] gap-4 border-b border-white/10 light:border-black/10 px-5 py-2.5 text-[10px] uppercase tracking-widest text-slate-600 sm:grid">
              <span>Description</span>
              <span>Category</span>
              <span>Date</span>
              <span className="text-right">Amount</span>
              <span />
            </div>
            <div className="divide-y divide-white/5 light:divide-black/5">
            {displayedActivity.map((a) => {
              const cat = categories.find((c) => c.id === a.categoryId)
              const isDebit = a.direction === 'debit'
              const color = isDebit ? 'text-rose-300 light:text-rose-700' : 'text-emerald-300 light:text-emerald-700'
              return (
                <div key={`${a.source}-${a.id}`} className="px-5 py-3 sm:py-4">
                  {/* Mobile: one compact row, long-press to delete (no visible delete icon) —
                      same icon-bubble + name/subtitle + trailing amount pattern as Accounts/Transactions. */}
                  <button
                    type="button"
                    onClick={() => handleActivityTap(a)}
                    onTouchStart={() => startLongPress('activity', a.id)}
                    onTouchEnd={cancelLongPress}
                    onTouchMove={cancelLongPress}
                    onTouchCancel={cancelLongPress}
                    onContextMenu={(e) => e.preventDefault()}
                    className="flex w-full min-w-0 items-center gap-3 text-left sm:hidden"
                  >
                    {selectSection === 'activity' ? (
                      selectedIds.has(a.id) ? (
                        <CheckCircle2 size={22} className="shrink-0 text-accent-400" />
                      ) : (
                        <div className="h-[22px] w-[22px] shrink-0 rounded-full border-2 border-white/20 light:border-black/20" />
                      )
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[.05] light:bg-black/[.035]" style={{ color: cat?.color || '#94a3b8' }}>
                        {isDebit ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-white light:text-slate-900">{capitalizeFirst(a.description)}</div>
                      <div className="truncate text-[11px] text-slate-500">{cat?.name || 'Uncategorised'} · {formatDateTime(a.date, a.time)}{a.status ? ` · ${a.status}` : ''}</div>
                    </div>
                    <div className={`shrink-0 text-sm font-semibold ${color}`}>{isDebit ? '-' : '+'}{showMoney ? money(a.amount) : '••••'}</div>
                  </button>

                  {/* Desktop: unchanged full row */}
                  <div className="hidden sm:grid sm:grid-cols-[1.4fr_.9fr_.6fr_.6fr_auto] sm:items-center sm:gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.05] light:bg-black/[.035]" style={{ color: cat?.color || '#94a3b8' }}>
                        {isDebit ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white light:text-slate-900">{capitalizeFirst(a.description)}</div>
                        {a.status && <div className="text-[11px] uppercase tracking-widest text-slate-500">{a.status}</div>}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 light:text-slate-500">
                      <span className="inline-block rounded-md bg-white/[.05] light:bg-black/[.035] px-2 py-0.5" style={{ color: cat?.color || '#94a3b8' }}>{cat?.name || 'Uncategorised'}</span>
                    </div>
                    <div className="text-xs text-slate-500">{formatDateTime(a.date, a.time)}</div>
                    <div className={`text-sm font-semibold sm:text-right ${color}`}>{isDebit ? '-' : '+'}{showMoney ? money(a.amount) : '••••'}</div>
                    <div className="flex justify-end gap-1">
                      {a.source === 'linked' && <button onClick={() => onEditTx?.(a.row)} className="rounded-lg p-1.5 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900" title="Edit"><Pencil size={13} /></button>}
                      <button onClick={() => deleteActivity(a)} className="rounded-lg p-1.5 text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              )
            })}
            </div>
          </>
        )}
        {displayedActivity.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-white/10 light:border-black/10 px-5 py-3">
            <span className="text-xs uppercase tracking-widest text-slate-500">Total</span>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-semibold text-white light:text-slate-900">{showMoney ? money(displayedTotal) : '••••'}</span>
              {reimbursableTotal > 0 && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-400 light:text-slate-500">Yours <span className="font-semibold text-white light:text-slate-900">{showMoney ? money(ownTotal) : '••••'}</span></span>
                  <span className="text-slate-600">·</span>
                  <span className="text-amber-300 light:text-amber-700">To be repaid <span className="font-semibold">{showMoney ? money(reimbursableTotal) : '••••'}</span></span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card">
        {selectSection === 'repayments' ? (
          <div className="flex items-center gap-2 border-b border-white/10 light:border-black/10 px-5 py-3 sm:hidden">
            <button type="button" onClick={exitSelectMode} className="shrink-0 rounded-xl border border-white/10 light:border-black/10 p-2 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900" title="Cancel selection"><X size={15} /></button>
            <div className="flex-1 text-sm font-medium text-white light:text-slate-900">{selectedIds.size} selected</div>
            <button type="button" disabled={selectedIds.size === 0} onClick={handleRepaymentsBulkDelete} className="shrink-0 rounded-xl border border-rose-300/30 bg-rose-300/10 p-2 text-rose-300 light:text-rose-700 hover:bg-rose-300/20 disabled:opacity-40 disabled:pointer-events-none" title="Delete selected"><Trash2 size={15} /></button>
          </div>
        ) : (
          <div className="border-b border-white/10 light:border-black/10 px-5 py-3 text-xs uppercase tracking-widest text-slate-500">Repayment history · {repayments.length}</div>
        )}
        {repayments.length === 0 ? (
          <div className="px-5 py-6 text-sm text-slate-500">No payments logged yet.</div>
        ) : (
          <div className="divide-y divide-white/5 light:divide-black/5">
            {repayments.map((r) => (
              <div key={r.id} className="px-5 py-3">
                {/* Mobile: long-press to multi-select, no visible delete icon */}
                <button
                  type="button"
                  onClick={() => handleRowTap('repayments', r.id)}
                  onTouchStart={() => startLongPress('repayments', r.id)}
                  onTouchEnd={cancelLongPress}
                  onTouchMove={cancelLongPress}
                  onTouchCancel={cancelLongPress}
                  onContextMenu={(e) => e.preventDefault()}
                  className="flex w-full items-center justify-between gap-3 text-left text-sm sm:hidden"
                >
                  <div className="flex items-center gap-2">
                    {selectSection === 'repayments' && (
                      selectedIds.has(r.id) ? (
                        <CheckCircle2 size={18} className="shrink-0 text-accent-400" />
                      ) : (
                        <div className="h-[18px] w-[18px] shrink-0 rounded-full border-2 border-white/20 light:border-black/20" />
                      )
                    )}
                    <div className="text-slate-300 light:text-slate-700">{formatDate(r.date)}</div>
                  </div>
                  <div className="font-medium text-emerald-300 light:text-emerald-700">{showMoney ? `+${money(r.amount)}` : '••••'}</div>
                </button>

                {/* Desktop: same row, with a visible delete icon */}
                <div className="hidden items-center justify-between gap-3 text-sm sm:flex">
                  <div className="text-slate-300 light:text-slate-700">{formatDate(r.date)}</div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-emerald-300 light:text-emerald-700">{showMoney ? `+${money(r.amount)}` : '••••'}</div>
                    <button onClick={() => onDeleteTx(r)} className="rounded-lg p-1.5 text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
