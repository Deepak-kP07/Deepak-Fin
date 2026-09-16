'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ChevronRight, Coins, Eye, EyeOff, MoreVertical, Pencil, RefreshCw, Trash2, TrendingDown, TrendingUp, X } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { HeroStatTile } from '@/components/shared/HeroStatTile'
import { formatDate, money } from '@/lib/format'

export function ChitFundDetailView({ fund, payments, accounts, onBack, onEdit, onDelete, onLogPayment, onTakePayout, onUndoPayout, onComplete, onReopen, onDeletePayment, showMoney, onToggleMoney, toast }) {
  const isTaken = fund.payout_status === 'taken'
  const isCompleted = fund.status === 'completed'
  const account = accounts.find((a) => a.id === fund.account_id)
  const paymentsForThis = payments.filter((p) => p.chit_fund_id === fund.id).sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
  const monthsPaid = paymentsForThis.length
  const pct = Number(fund.duration_months) > 0 ? Math.min(100, Math.round((monthsPaid / Number(fund.duration_months)) * 100)) : 0
  const netPaid = paymentsForThis.reduce((s, p) => s + Number(p.amount) - Number(p.dividend_received || 0), 0)
  const remaining = Math.max(0, Number(fund.duration_months) - monthsPaid) * Number(fund.monthly_contribution)
  // Only meaningful once completed — payout received minus everything ever paid in, net of
  // dividends, across the fund's whole life (not just before payout).
  const finalGainLoss = Number(fund.payout_amount || 0) - netPaid

  // Mobile: long-press a payment row to enter multi-select, same pattern as Loans' payment
  // history (features/loans/LoanDetailView.jsx) — no sharing/roles here, so no need for
  // Lend/Borrow's extra role-gating on top of it.
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
  const handleRowTap = (id) => {
    if (longPressFired.current) { longPressFired.current = false; return }
    if (selectMode) toggleSelect(id)
  }
  const handleBulkDelete = async () => {
    for (const id of selectedIds) await onDeletePayment(id)
    exitSelectMode()
  }

  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef(null)
  useEffect(() => {
    const onDocClick = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  return (
    <div className="space-y-5 pb-8">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 light:text-slate-500 hover:text-white hover:light:text-slate-900"><ChevronRight size={14} className="rotate-180" /> Back to chit funds</button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start justify-between gap-3 sm:contents">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight text-white light:text-slate-900">{fund.name}</h1>
              <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${isCompleted ? 'bg-slate-500/15 text-slate-400 light:text-slate-500' : isTaken ? 'bg-amber-400/15 text-amber-200 light:text-amber-700' : 'bg-accent-400/15 text-accent-200 light:text-accent-700'}`}>{isTaken ? 'Payout Taken' : 'Not Taken'}</span>
              {isCompleted && <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-slate-400 light:text-slate-500">Completed</span>}
            </div>
            <div className="mt-1 text-sm text-slate-500">{money(fund.monthly_contribution)}/mo · {formatDate(fund.start_date)}{account ? ` · ${account.name}` : ''}</div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:hidden">
            <button onClick={onToggleMoney} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
              {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <div ref={moreRef} className="relative">
              <button type="button" onClick={() => setMoreOpen((o) => !o)} className={`rounded-xl border p-2.5 transition ${moreOpen ? 'border-accent-300/40 bg-accent-400/10 text-accent-200 light:text-accent-700' : 'border-white/10 light:border-black/10 text-slate-400 light:text-slate-500 hover:bg-white/5'}`} title="More options">
                <MoreVertical size={16} />
              </button>
              {moreOpen && (
                <div className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-1 shadow-2xl">
                  {!isTaken && !isCompleted && <button type="button" onClick={() => { setMoreOpen(false); onTakePayout(fund) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5"><Coins size={14} />Take payout</button>}
                  {isTaken && !isCompleted && <button type="button" onClick={() => { setMoreOpen(false); onUndoPayout(fund) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5"><RefreshCw size={14} />Undo payout</button>}
                  {isTaken && !isCompleted && <button type="button" onClick={() => { setMoreOpen(false); onComplete(fund) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5"><CheckCircle2 size={14} />Mark completed</button>}
                  {isCompleted && <button type="button" onClick={() => { setMoreOpen(false); onReopen(fund) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5"><RefreshCw size={14} />Reopen</button>}
                  <button type="button" onClick={() => { setMoreOpen(false); onEdit(fund) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5"><Pencil size={14} />Edit chit fund</button>
                  <button type="button" onClick={() => { setMoreOpen(false); onDelete(fund) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={14} />Delete chit fund</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          {!isCompleted && <button onClick={() => onLogPayment(fund)} className="hidden rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-4 py-2.5 text-sm font-semibold text-[#07101c] lg:inline-block">+ Log payment</button>}
          <div className="hidden sm:contents">
            {!isTaken && !isCompleted && <button onClick={() => onTakePayout(fund)} className="rounded-xl border border-white/10 light:border-black/10 px-4 py-2.5 text-sm font-semibold text-slate-200 light:text-slate-800 hover:bg-white/5">Take payout</button>}
            {isTaken && !isCompleted && <button onClick={() => onUndoPayout(fund)} className="rounded-xl border border-white/10 light:border-black/10 px-4 py-2.5 text-sm font-semibold text-slate-200 light:text-slate-800 hover:bg-white/5">Undo payout</button>}
            {isTaken && !isCompleted && <button onClick={() => onComplete(fund)} className="rounded-xl border border-white/10 light:border-black/10 px-4 py-2.5 text-sm font-semibold text-slate-200 light:text-slate-800 hover:bg-white/5">Mark completed</button>}
            {isCompleted && <button onClick={() => onReopen(fund)} className="rounded-xl border border-white/10 light:border-black/10 px-4 py-2.5 text-sm font-semibold text-slate-200 light:text-slate-800 hover:bg-white/5">Reopen</button>}
            <button onClick={() => onEdit(fund)} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900"><Pencil size={15} /></button>
            <button onClick={() => onDelete(fund)} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={15} /></button>
            <button onClick={onToggleMoney} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
              {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
        </div>
      </div>

      {isCompleted && (
        <div className={`rounded-2xl border p-5 ${finalGainLoss >= 0 ? 'border-emerald-400/15 bg-emerald-500/[.03]' : 'border-rose-400/15 bg-rose-500/[.03]'}`}>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500">{finalGainLoss >= 0 ? <TrendingUp size={13} className="text-emerald-300 light:text-emerald-700" /> : <TrendingDown size={13} className="text-rose-300 light:text-rose-700" />}Final result</div>
          <div className={`mt-1 text-2xl font-semibold ${finalGainLoss >= 0 ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700'}`}>{finalGainLoss >= 0 ? '+' : '−'}{showMoney ? money(Math.abs(finalGainLoss)) : '••••'}</div>
          <div className="mt-1 text-xs text-slate-500">{showMoney ? money(fund.payout_amount || 0) : '••••'} received, {showMoney ? money(netPaid) : '••••'} paid in across {monthsPaid} month{monthsPaid === 1 ? '' : 's'}</div>
        </div>
      )}

      <div className="rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] glassy:glass-card p-6">
        <div className="text-xs uppercase tracking-widest text-slate-500">{isTaken ? 'Outstanding liability' : 'Receivable'}</div>
        <div className="mt-1 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[1.1] tracking-[-0.01em] text-white light:text-slate-900">{showMoney ? money(isTaken ? remaining : netPaid) : '••••'}</div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
          <div className={`h-full rounded-full transition-all ${isCompleted ? 'bg-slate-500' : isTaken ? 'bg-amber-400' : 'bg-accent-400'}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <HeroStatTile label="Paid so far" value={showMoney ? money(netPaid) : '••••'} valueTone="text-accent-300 light:text-accent-700" sub={`${monthsPaid} of ${fund.duration_months} months`} />
          <HeroStatTile label={isTaken ? 'Payout received' : 'Progress'} value={isTaken ? (showMoney ? money(fund.payout_amount || 0) : '••••') : `${pct}%`} valueTone={isTaken ? 'text-emerald-300 light:text-emerald-700' : 'text-white light:text-slate-900'} sub={isTaken ? (fund.payout_month ? `Month ${fund.payout_month}` : undefined) : undefined} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card">
        {selectMode ? (
          <div className="flex items-center gap-2 border-b border-white/10 light:border-black/10 px-5 py-3 sm:hidden">
            <button type="button" onClick={exitSelectMode} className="shrink-0 rounded-xl border border-white/10 light:border-black/10 p-2 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900" title="Cancel selection"><X size={15} /></button>
            <div className="flex-1 text-sm font-medium text-white light:text-slate-900">{selectedIds.size} selected</div>
            <button type="button" disabled={selectedIds.size === 0} onClick={handleBulkDelete} className="shrink-0 rounded-xl border border-rose-300/30 bg-rose-300/10 p-2 text-rose-300 light:text-rose-700 hover:bg-rose-300/20 disabled:opacity-40 disabled:pointer-events-none" title="Delete selected"><Trash2 size={15} /></button>
          </div>
        ) : (
          <div className="border-b border-white/10 light:border-black/10 px-5 py-3 text-xs uppercase tracking-widest text-slate-500">Payment history · {paymentsForThis.length}</div>
        )}
        {paymentsForThis.length === 0 ? (
          <EmptyState compact icon={Coins} title="No payments yet" message={isCompleted ? 'This chit fund is completed.' : 'Log it here each time you pay this month\'s contribution.'} cta={isCompleted ? undefined : 'Log payment'} onCta={isCompleted ? undefined : () => onLogPayment(fund)} />
        ) : (
          <>
            <div className="hidden grid-cols-[1.4fr_.9fr_.6fr_.6fr_auto] gap-4 border-b border-white/10 light:border-black/10 px-5 py-2.5 text-[10px] uppercase tracking-widest text-slate-600 sm:grid">
              <span>Payment</span>
              <span>Account</span>
              <span>Date</span>
              <span className="text-right">Amount</span>
              <span />
            </div>
            <div className="divide-y divide-white/5 light:divide-black/5">
              {paymentsForThis.map((p, i) => {
                const acc = accounts.find((a) => a.id === p.account_id)
                const dividend = Number(p.dividend_received || 0)
                return (
                  <div key={p.id} className="px-5 py-3 sm:py-4">
                    <button
                      type="button"
                      onClick={() => handleRowTap(p.id)}
                      onTouchStart={() => startLongPress(p.id)}
                      onTouchEnd={cancelLongPress}
                      onTouchMove={cancelLongPress}
                      onTouchCancel={cancelLongPress}
                      onContextMenu={(e) => e.preventDefault()}
                      className="flex w-full min-w-0 items-center gap-3 text-left sm:hidden"
                    >
                      {selectMode ? (
                        selectedIds.has(p.id) ? (
                          <CheckCircle2 size={22} className="shrink-0 text-accent-400" />
                        ) : (
                          <div className="h-[22px] w-[22px] shrink-0 rounded-full border-2 border-white/20 light:border-black/20" />
                        )
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[.05] light:bg-black/[.035] text-accent-200 light:text-accent-700"><Coins size={16} /></div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white light:text-slate-900">Payment #{paymentsForThis.length - i}</div>
                        <div className="truncate text-[11px] text-slate-500">{formatDate(p.payment_date)}{acc ? ` · ${acc.name}` : ''}{dividend > 0 ? ` · ${money(dividend)} dividend` : ''}</div>
                      </div>
                      <div className="shrink-0 text-sm font-semibold text-white light:text-slate-900">{showMoney ? money(p.amount) : '••••'}</div>
                    </button>

                    <div className="hidden sm:grid sm:grid-cols-[1.4fr_.9fr_.6fr_.6fr_auto] sm:items-center sm:gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.05] light:bg-black/[.035] text-accent-200 light:text-accent-700"><Coins size={16} /></div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-white light:text-slate-900">Payment #{paymentsForThis.length - i}</div>
                          {dividend > 0 && <div className="truncate text-[11px] text-slate-500">{money(dividend)} dividend</div>}
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 light:text-slate-500">
                        <span className="inline-block rounded-md bg-white/[.05] light:bg-black/[.035] px-2 py-0.5 text-slate-300 light:text-slate-700">{acc?.name || 'No account'}</span>
                      </div>
                      <div className="text-xs text-slate-500">{formatDate(p.payment_date)}</div>
                      <div className="text-sm font-semibold text-white light:text-slate-900 sm:text-right">{showMoney ? money(p.amount) : '••••'}</div>
                      <div className="flex justify-end">
                        <button onClick={() => onDeletePayment(p.id)} className="rounded-lg p-1.5 text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={13} /></button>
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
