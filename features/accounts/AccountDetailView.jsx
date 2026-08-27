'use client'

import { useRef, useState } from 'react'
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, CheckCircle2, ChevronRight, Eye, EyeOff, Landmark, Pencil, Plus, RefreshCw, Trash2, Wallet, X } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BankCardFace } from '@/components/shared/BankCardFace'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { NetBar } from '@/components/shared/NetBar'
import { MonthCursor } from '@/components/shared/MonthCursor'
import { formatDateTime, money, monthName } from '@/lib/format'

export function AccountDetailView({ account, debitCard, transactions, categories, onBack, onEdit, onDelete, onEditCard, onDeleteTx, onDeleteTxBulk, onAddTransaction, onSyncBalance, showMoney, onToggleMoney }) {
  const [syncOpen, setSyncOpen] = useState(false)
  const [syncValue, setSyncValue] = useState('')
  const [syncBusy, setSyncBusy] = useState(false)
  const activity = transactions
    .filter((t) => t.account_id === account.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date) || String(b.time || '').localeCompare(String(a.time || '')))

  // Same pattern as the main ledger (TransactionsView in app/page.js): no per-row delete icon on
  // mobile — a long press enters selection mode, a plain tap after that toggles a row, and a
  // bulk-delete action appears in the header toolbar. Desktop keeps its always-visible delete icon.
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
  }
  const handleBulkDelete = async () => {
    const didDelete = await onDeleteTxBulk([...selectedIds])
    if (didDelete) exitSelectMode()
  }

  const [monthCursor, setMonthCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } })
  const [showAllMonths, setShowAllMonths] = useState(false)
  const shiftMonth = (delta) => { setShowAllMonths(false); setMonthCursor((c) => { const d = new Date(c.year, c.month + delta, 1); return { year: d.getFullYear(), month: d.getMonth() } }) }
  const monthActivity = showAllMonths ? activity : activity.filter((a) => {
    const d = new Date(a.date)
    return d.getFullYear() === monthCursor.year && d.getMonth() === monthCursor.month
  })

  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: monthName(d), net: 0 })
  }
  activity.forEach((t) => {
    const d = new Date(t.date)
    const bucket = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`)
    if (!bucket) return
    const isIn = t.type === 'income' || (t.type === 'transfer' && t.transfer_direction === 'in')
    bucket.net += isIn ? Number(t.amount || 0) : -Number(t.amount || 0)
  })

  const inflow = activity.reduce((s, t) => { const isIn = t.type === 'income' || (t.type === 'transfer' && t.transfer_direction === 'in'); return isIn ? s + Number(t.amount || 0) : s }, 0)
  const outflow = activity.reduce((s, t) => { const isOut = t.type === 'expense' || (t.type === 'transfer' && t.transfer_direction === 'out'); return isOut ? s + Number(t.amount || 0) : s }, 0)

  return (
    <div className="space-y-5 pb-8">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 light:text-slate-500 hover:text-white hover:light:text-slate-900"><ChevronRight size={14} className="rotate-180" /> Back to accounts</button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        {debitCard ? (
          <div className="w-72 sm:w-80">
            <BankCardFace name={debitCard.name || account.name} subtitle="Debit card" last4={debitCard.account_number_last4 || account.account_number_last4} color={account.color || '#22d3ee'} />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: `${account.color || '#22d3ee'}22`, color: account.color || '#22d3ee' }}>
              {account.type === 'cash' ? <Wallet size={22} /> : <Landmark size={22} />}
            </div>
            <div>
              <div className="text-lg font-semibold text-white light:text-slate-900">{account.name}</div>
              <div className="text-xs capitalize text-slate-500">{account.type.replace('_', ' ')}{account.bank_name ? ` · ${account.bank_name}` : ''}{account.account_number_last4 ? ` · •${account.account_number_last4}` : ''}</div>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onAddTransaction(account.id)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-4 py-2.5 text-sm font-semibold text-[#07101c]"><Plus size={15} />Add transaction</button>
          <button onClick={() => setSyncOpen((o) => !o)} className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${syncOpen ? 'border-accent-300/40 bg-accent-400/10 text-accent-200 light:text-accent-700' : 'border-white/10 light:border-black/10 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900'}`}><RefreshCw size={15} /><span className="hidden sm:inline">Sync</span></button>
          <button onClick={() => onEdit(account)} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900"><Pencil size={15} /></button>
          <button onClick={() => onDelete(account)} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={15} /></button>
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      {syncOpen && (
        <div className="rounded-xl border border-accent-300/20 bg-accent-400/[.03] p-4">
          <div className="text-sm text-slate-300 light:text-slate-700">Sync with your bank's real balance</div>
          <div className="mt-1 text-[11px] text-slate-500">If your bank's app shows a different number — a fee, interest credit, or a transaction you never logged here — enter the real balance and it'll be reconciled with a labeled adjustment entry.</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input type="number" step="0.01" value={syncValue} onChange={(e) => setSyncValue(e.target.value)} placeholder={String(Math.round(account.current_balance))} className="w-40 rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-2 text-sm text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
            <button
              type="button"
              disabled={syncBusy || !syncValue}
              onClick={async () => {
                setSyncBusy(true)
                await onSyncBalance(account, Number(syncValue))
                setSyncBusy(false); setSyncOpen(false); setSyncValue('')
              }}
              className="rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-4 py-2 text-sm font-semibold text-[#07101c] disabled:opacity-50"
            >{syncBusy ? 'Syncing…' : 'Sync'}</button>
            {syncValue && (
              <span className="text-[11px] text-slate-500">
                {Number(syncValue) < Number(account.current_balance) ? `${money(Number(account.current_balance) - Number(syncValue))} lower than tracked` : Number(syncValue) > Number(account.current_balance) ? `${money(Number(syncValue) - Number(account.current_balance))} higher than tracked` : 'Matches already'}
              </span>
            )}
          </div>
        </div>
      )}

      {debitCard && (
        <div className="flex items-center justify-between rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025] glassy:glass-card px-5 py-3">
          <div className="text-sm text-white light:text-slate-900">{account.name}</div>
          <button onClick={() => onEditCard(debitCard)} className="text-xs text-accent-300 light:text-accent-700 hover:underline">Edit card</button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Current balance" value={showMoney ? money(account.current_balance) : '••••'} icon={Landmark} accent="bg-accent-300/15 text-accent-200 light:text-accent-700" sub={<span>Opening {money(account.opening_balance)}</span>} />
        <StatCard label="Money in" value={showMoney ? money(inflow) : '••••'} icon={ArrowUpRight} accent="bg-emerald-400/15 text-emerald-200 light:text-emerald-700" tone="text-emerald-300 light:text-emerald-700" sub={<span>{activity.length} total transaction{activity.length === 1 ? '' : 's'}</span>} />
        <StatCard label="Money out" value={showMoney ? money(outflow) : '••••'} icon={ArrowDownRight} accent="bg-rose-400/15 text-rose-200 light:text-rose-700" tone="text-rose-300 light:text-rose-700" sub={<span>All time</span>} />
      </div>

      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025] glassy:glass-card p-5">
        <div className="text-sm font-semibold text-white light:text-slate-900">Net cash flow by month · last 6 months</div>
        <div className="mt-4 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={months}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff11" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip cursor={{ fill: '#ffffff08' }} contentStyle={{ background: '#0f1420', border: '1px solid #ffffff22', borderRadius: 12, color: '#fff' }} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} formatter={(v) => money(v)} />
              <Bar dataKey="net" maxBarSize={28} shape={<NetBar />} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025] glassy:glass-card">
        {selectMode ? (
          <div className="flex items-center gap-2 border-b border-white/10 light:border-black/10 px-5 py-3 sm:hidden">
            <button type="button" onClick={exitSelectMode} className="shrink-0 rounded-xl border border-white/10 light:border-black/10 p-2 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900" title="Cancel selection"><X size={15} /></button>
            <div className="flex-1 text-sm font-medium text-white light:text-slate-900">{selectedIds.size} selected</div>
            <button type="button" disabled={selectedIds.size === 0} onClick={handleBulkDelete} className="shrink-0 rounded-xl border border-rose-300/30 bg-rose-300/10 p-2 text-rose-300 light:text-rose-700 hover:bg-rose-300/20 disabled:opacity-40 disabled:pointer-events-none" title="Delete selected"><Trash2 size={15} /></button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 border-b border-white/10 light:border-black/10 px-5 py-3">
            <div className="text-xs uppercase tracking-widest text-slate-500">Account activity · {monthActivity.length}</div>
            <MonthCursor cursor={monthCursor} onShift={shiftMonth} showAll={showAllMonths} onToggleAll={() => setShowAllMonths((v) => !v)} />
          </div>
        )}
        {monthActivity.length === 0 ? (
          <EmptyState compact icon={ArrowDownRight} title={showAllMonths ? 'No activity yet' : 'No activity this month'} message="Transactions on this account will show up here." />
        ) : (
          <>
            <div className="hidden grid-cols-[1.4fr_.9fr_.6fr_.6fr_auto] gap-4 border-b border-white/10 light:border-black/10 px-5 py-2.5 text-[10px] uppercase tracking-widest text-slate-600 sm:grid">
              <span>Description</span>
              <span>Category</span>
              <span>Date</span>
              <span className="text-right">Amount</span>
              <span />
            </div>
            <div className="max-h-96 divide-y divide-white/5 light:divide-black/5 overflow-y-auto">
              {monthActivity.map((t) => {
                const cat = categories.find((c) => c.id === t.category_id)
                const isIn = t.type === 'income' || (t.type === 'transfer' && t.transfer_direction === 'in')
                const isTransfer = t.type === 'transfer'
                const color = isIn ? 'text-emerald-300 light:text-emerald-700' : isTransfer ? 'text-accent-300 light:text-accent-700' : 'text-rose-300 light:text-rose-700'
                return (
                  <div key={t.id} className="px-5 py-3 sm:py-4">
                    {/* Mobile: icon-bubble/select-indicator + name/subtitle + trailing amount, one
                        row — same pattern as the main ledger (TransactionsView in app/page.js). No
                        per-row delete icon; long-press enters selection mode instead. */}
                    <button
                      type="button"
                      onClick={() => handleRowTap(t)}
                      onTouchStart={() => startLongPress(t.id)}
                      onTouchEnd={cancelLongPress}
                      onTouchMove={cancelLongPress}
                      onTouchCancel={cancelLongPress}
                      onContextMenu={(e) => e.preventDefault()}
                      className="flex w-full min-w-0 items-center gap-3 text-left sm:hidden"
                    >
                      {selectMode ? (
                        selectedIds.has(t.id) ? (
                          <CheckCircle2 size={22} className="shrink-0 text-accent-400" />
                        ) : (
                          <div className="h-[22px] w-[22px] shrink-0 rounded-full border-2 border-white/20 light:border-black/20" />
                        )
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[.05] light:bg-black/[.035]" style={{ color: cat?.color || (isTransfer ? '#22d3ee' : '#94a3b8') }}>
                          {isTransfer ? <ArrowLeftRight size={16} /> : isIn ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white light:text-slate-900">{t.description}</div>
                        <div className="truncate text-[11px] text-slate-500">{cat?.name || (isTransfer ? (t.transfer_direction === 'in' ? 'Transfer in' : 'Transfer out') : 'Uncategorised')} · {formatDateTime(t.date, t.time)}</div>
                      </div>
                      <div className={`shrink-0 text-sm font-semibold ${color}`}>{isIn ? '+' : '-'}{showMoney ? money(t.amount) : '••••'}</div>
                    </button>

                    {/* Desktop: unchanged full row */}
                    <div className="hidden sm:grid sm:grid-cols-[1.4fr_.9fr_.6fr_.6fr_auto] sm:items-center sm:gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.05] light:bg-black/[.035]" style={{ color: cat?.color || (isTransfer ? '#22d3ee' : '#94a3b8') }}>
                          {isTransfer ? <ArrowLeftRight size={16} /> : isIn ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-white light:text-slate-900">{t.description}</div>
                          {t.notes && <div className="truncate text-[11px] text-slate-500">{t.notes}</div>}
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 light:text-slate-500">
                        <span className="inline-block rounded-md bg-white/[.05] light:bg-black/[.035] px-2 py-0.5" style={{ color: cat?.color || '#94a3b8' }}>{cat?.name || (isTransfer ? (t.transfer_direction === 'in' ? 'Transfer in' : 'Transfer out') : 'Uncategorised')}</span>
                      </div>
                      <div className="text-xs text-slate-500">{formatDateTime(t.date, t.time)}</div>
                      <div className={`text-sm font-semibold sm:text-right ${color}`}>{isIn ? '+' : '-'}{showMoney ? money(t.amount) : '••••'}</div>
                      <div className="flex justify-end">
                        <button onClick={() => onDeleteTx(t)} className="rounded-lg p-1.5 text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
