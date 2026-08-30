'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, ChevronRight, Eye, EyeOff, MoreVertical, Pencil, Plus, Trash2, User, UserPlus } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { HeroStatTile } from '@/components/shared/HeroStatTile'
import { capitalizeFirst, formatDate, money } from '@/lib/format'
import { roleFor, canEditRecord, canDeleteRecord, canLogRepayment, canManageShares } from '@/lib/lendBorrowSharing'

export function LendBorrowDetailView({ record, repayments, additions = [], accounts, transactions, onBack, onEdit, onDelete, onDeleteTx, onLogRepayment, onAddMore, onManageAccess, showMoney, onToggleMoney, toast }) {
  const role = roleFor(record)
  const isLent = record.type === 'lent'
  const isSettled = record.status === 'returned'
  const repaid = Number(record.amount_repaid || 0)
  const pending = Math.max(0, Number(record.amount) - repaid)
  const pct = Number(record.amount) > 0 ? Math.min(100, Math.round((repaid / Number(record.amount)) * 100)) : 0
  const overdue = record.due_date && record.status !== 'returned' && new Date(record.due_date) < new Date()
  // A collaborator's own `accounts` prop is their own list, not the owner's — accounts keeps its
  // own owner-only RLS, so the owner's linked account is resolved server-side instead
  // (record.linked_account, via lend_borrow_owner_account()) and used as a fallback.
  const account = accounts.find((a) => a.id === record.from_account_id) || record.linked_account
  const paymentsForThis = repayments
    .filter((r) => r.lend_borrow_id === record.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  const additionsForThis = additions
    .filter((a) => a.lend_borrow_id === record.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  // Same reasoning as deletePayment below — deleting an addition-linked transaction reverses
  // lend_borrow.amount/status server-side (reverseLendAddition), which only runs once the delete
  // actually reaches the server.
  const deleteAddition = (a) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.push('Deleting this needs a connection — try again once you’re back online.', 'error')
      return
    }
    const tx = transactions.find((t) => t.id === a.linked_transaction_id)
    if (tx) onDeleteTx(tx)
  }

  // Deleting a lend-linked transaction reverses lend_repayments/amount_repaid/status
  // server-side (reverseLendRepayment) — that reversal only runs once the delete actually
  // reaches the server, so an offline optimistic delete would leave this screen showing a
  // stale repaid amount/status with no visible "pending sync" signal on that number. Blocked
  // the same way TransactionForm already blocks creating a repayment offline.
  const deletePayment = (r) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.push('Deleting a payment needs a connection — try again once you’re back online.', 'error')
      return
    }
    const tx = transactions.find((t) => t.id === r.linked_transaction_id)
    if (tx) onDeleteTx(tx)
  }

  // Mobile payment rows have no visible delete icon — a long press deletes directly (deletePayment
  // itself routes through onDeleteTx, which already confirms before acting), same 500ms
  // timing/suppression pattern as the Loans and Credit Cards detail views.
  const longPressTimer = useRef(null)
  const longPressFired = useRef(false)
  const LONG_PRESS_MS = 500
  const cancelLongPress = () => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null } }
  const startLongPress = (r) => {
    if (!canLogRepayment(role)) return
    longPressFired.current = false
    cancelLongPress()
    longPressTimer.current = setTimeout(() => { longPressFired.current = true; deletePayment(r) }, LONG_PRESS_MS)
  }
  const suppressLongPressTap = () => { longPressFired.current = false }

  // Mobile: Manage access/Edit/Delete collapse into this "..." menu, same pattern as the other
  // detail views — the eye toggle stays outside it, always visible. Desktop is unchanged.
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef(null)
  useEffect(() => {
    const onDocClick = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  return (
    <div className="space-y-5 pb-8">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 light:text-slate-500 hover:text-white hover:light:text-slate-900"><ChevronRight size={14} className="rotate-180" /> Back to lend &amp; borrow</button>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="flex items-start justify-between gap-3 sm:contents">
          <div className="flex items-center gap-3">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${isLent ? 'bg-emerald-400/15 text-emerald-200 light:text-emerald-700' : 'bg-rose-400/15 text-rose-200 light:text-rose-700'}`}>
              <User size={22} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-lg font-semibold text-white light:text-slate-900">{capitalizeFirst(record.person_name)}</div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${isLent ? 'bg-emerald-400/15 text-emerald-200 light:text-emerald-700' : 'bg-rose-400/15 text-rose-200 light:text-rose-700'}`}>{isLent ? 'lent' : 'borrowed'}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${record.status === 'returned' ? 'bg-emerald-400/15 text-emerald-200 light:text-emerald-700' : record.status === 'partial' ? 'bg-amber-400/15 text-amber-200 light:text-amber-700' : 'bg-accent-400/15 text-accent-200 light:text-accent-700'}`}>{record.status}</span>
                {overdue && <span className="rounded-full bg-rose-400/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-rose-200 light:text-rose-700">overdue</span>}
              </div>
              <div className="mt-1 text-xs text-slate-500">{capitalizeFirst(record.reason) || (isLent ? 'Lent' : 'Borrowed')} · {formatDate(record.date)}{account ? ` · ${account.name}` : ''}{record.due_date ? ` · due ${formatDate(record.due_date)}` : ''}</div>
            </div>
          </div>

          {/* Mobile: Manage access/Edit/Delete collapse into this "..." menu; eye toggle stays
              outside it, always visible, same as every other detail view. */}
          <div className="flex shrink-0 items-center gap-2 sm:hidden">
            <button onClick={onToggleMoney} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
              {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            {(canManageShares(role) || canEditRecord(role) || canDeleteRecord(role)) && (
              <div ref={moreRef} className="relative">
                <button type="button" onClick={() => setMoreOpen((o) => !o)} className={`rounded-xl border p-2.5 transition ${moreOpen ? 'border-accent-300/40 bg-accent-400/10 text-accent-200 light:text-accent-700' : 'border-white/10 light:border-black/10 text-slate-400 light:text-slate-500 hover:bg-white/5'}`} title="More options">
                  <MoreVertical size={16} />
                </button>
                {moreOpen && (
                  <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-1 shadow-2xl">
                    {canManageShares(role) && (
                      <button type="button" onClick={() => { setMoreOpen(false); onManageAccess(record) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5"><UserPlus size={14} />Manage access</button>
                    )}
                    {canEditRecord(role) && (
                      <button type="button" onClick={() => { setMoreOpen(false); onEdit(record) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5"><Pencil size={14} />Edit record</button>
                    )}
                    {canDeleteRecord(role) && (
                      <button type="button" onClick={() => { setMoreOpen(false); onDelete(record) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={14} />Delete record</button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto">
          {canLogRepayment(role) && (
            <button onClick={() => onLogRepayment(record)} disabled={isSettled} title={isSettled ? 'Already fully settled' : undefined} className="hidden rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-4 py-2.5 text-sm font-semibold text-[#07101c] disabled:opacity-40 lg:inline-block">+ Log {isLent ? 'repayment' : 'payment'}</button>
          )}
          {/* Unlike "Log repayment" above, this has no mobile FAB shortcut, so it stays visible
              at every width instead of hiding below lg — otherwise mobile would have no way to
              trigger it once the "no additions yet" empty-state CTA is gone. */}
          {canLogRepayment(role) && (
            <button onClick={() => onAddMore(record)} className="rounded-xl border border-white/10 light:border-black/10 px-4 py-2.5 text-sm font-semibold text-slate-200 light:text-slate-800 hover:bg-white/5">+ {isLent ? 'Lend' : 'Borrow'} more</button>
          )}
          {/* Desktop: unchanged, everything stays inline */}
          <div className="hidden sm:contents">
            {canManageShares(role) && (
              <button onClick={() => onManageAccess(record)} title="Manage who has access" className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900"><UserPlus size={15} /></button>
            )}
            {canEditRecord(role) && (
              <button onClick={() => onEdit(record)} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900"><Pencil size={15} /></button>
            )}
            {canDeleteRecord(role) && (
              <button onClick={() => onDelete(record)} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={15} /></button>
            )}
            <button onClick={onToggleMoney} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
              {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] glassy:glass-card p-6">
        <div className="text-xs uppercase tracking-widest text-slate-500">{isLent ? 'They still owe you' : 'You still owe'}</div>
        <div className="mt-1 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[1.1] tracking-[-0.01em] text-white light:text-slate-900">{showMoney ? money(pending) : '••••'}</div>
        <div className="mt-1 text-sm text-slate-500">of {money(record.amount)} total</div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
          <div className={`h-full rounded-full transition-all ${isLent ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <HeroStatTile label={isLent ? 'Repaid to you' : 'Paid by you'} value={showMoney ? money(repaid) : '••••'} valueTone="text-accent-300 light:text-accent-700" sub={`${paymentsForThis.length} payment${paymentsForThis.length === 1 ? '' : 's'}`} />
          <HeroStatTile label="Settled" value={`${pct}%`} valueTone={pct >= 100 ? 'text-emerald-300 light:text-emerald-700' : pct > 0 ? 'text-amber-300 light:text-amber-700' : 'text-slate-400 light:text-slate-500'} sub={pct >= 100 ? 'Fully settled' : 'In progress'} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card">
        <div className="border-b border-white/10 light:border-black/10 px-5 py-3 text-xs uppercase tracking-widest text-slate-500">{isLent ? 'Repayments received' : 'Payments made'} · {paymentsForThis.length}</div>
        {paymentsForThis.length === 0 ? (
          <EmptyState compact icon={isLent ? ArrowDownRight : ArrowUpRight} title="No payments yet" message={isSettled ? 'This record is fully settled.' : `Log it here when ${isLent ? 'they repay you' : 'you make a payment'}.`} cta={isSettled || !canLogRepayment(role) ? undefined : `Log ${isLent ? 'repayment' : 'payment'}`} onCta={isSettled || !canLogRepayment(role) ? undefined : () => onLogRepayment(record)} />
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
              {paymentsForThis.map((r, i) => {
                const acc = accounts.find((a) => a.id === r.account_id)
                const amountColor = isLent ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700'
                return (
                  <div key={r.id} className="px-5 py-3 sm:py-4">
                    {/* Mobile: single compact row, date under the description — same pattern as
                        the main ledger — with long-press to delete (no visible delete icon). */}
                    <button
                      type="button"
                      onClick={suppressLongPressTap}
                      onTouchStart={() => startLongPress(r)}
                      onTouchEnd={cancelLongPress}
                      onTouchMove={cancelLongPress}
                      onTouchCancel={cancelLongPress}
                      onContextMenu={(e) => e.preventDefault()}
                      className="flex w-full min-w-0 items-center gap-3 text-left sm:hidden"
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[.05] light:bg-black/[.035] ${amountColor}`}>
                        {isLent ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white light:text-slate-900">Payment #{paymentsForThis.length - i}</div>
                        <div className="truncate text-[11px] text-slate-500">{formatDate(r.date)}{acc ? ` · ${acc.name}` : ''}</div>
                      </div>
                      <div className={`shrink-0 text-sm font-semibold ${amountColor}`}>{isLent ? '+' : '-'}{showMoney ? money(r.amount) : '••••'}</div>
                    </button>

                    {/* Desktop: unchanged full row */}
                    <div className="hidden sm:grid sm:grid-cols-[1.4fr_.9fr_.6fr_.6fr_auto] sm:items-center sm:gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.05] light:bg-black/[.035] ${amountColor}`}>
                          {isLent ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-white light:text-slate-900">Payment #{paymentsForThis.length - i}</div>
                          {r.notes && <div className="truncate text-[11px] text-slate-500">{capitalizeFirst(r.notes)}</div>}
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 light:text-slate-500">
                        <span className="inline-block rounded-md bg-white/[.05] light:bg-black/[.035] px-2 py-0.5 text-slate-300 light:text-slate-700">{acc?.name || 'No account'}</span>
                      </div>
                      <div className="text-xs text-slate-500">{formatDate(r.date)}</div>
                      <div className={`text-sm font-semibold sm:text-right ${amountColor}`}>{isLent ? '+' : '-'}{showMoney ? money(r.amount) : '••••'}</div>
                      <div className="flex justify-end">
                        {canLogRepayment(role) && <button onClick={() => deletePayment(r)} className="rounded-lg p-1.5 text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={13} /></button>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Every top-up against this same record, dated — this is what replaces creating a whole
          new card each time more gets lent/borrowed from the same person. */}
      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card">
        <div className="border-b border-white/10 light:border-black/10 px-5 py-3 text-xs uppercase tracking-widest text-slate-500">{isLent ? 'More lent' : 'More borrowed'} · {additionsForThis.length}</div>
        {additionsForThis.length === 0 ? (
          <EmptyState compact icon={Plus} title="No top-ups yet" message={`Log it here if you ${isLent ? 'lend them' : 'borrow'} more later.`} cta={!canLogRepayment(role) ? undefined : `${isLent ? 'Lend' : 'Borrow'} more`} onCta={!canLogRepayment(role) ? undefined : () => onAddMore(record)} />
        ) : (
          <>
            <div className="hidden grid-cols-[1.4fr_.9fr_.6fr_.6fr_auto] gap-4 border-b border-white/10 light:border-black/10 px-5 py-2.5 text-[10px] uppercase tracking-widest text-slate-600 sm:grid">
              <span>Top-up</span>
              <span>Account</span>
              <span>Date</span>
              <span className="text-right">Amount</span>
              <span />
            </div>
            <div className="divide-y divide-white/5 light:divide-black/5">
              {additionsForThis.map((a, i) => {
                const acc = accounts.find((acct) => acct.id === a.account_id)
                return (
                  <div key={a.id} className="px-5 py-3 sm:py-4">
                    {/* Mobile: single compact row, same pattern as the repayments list above */}
                    <div className="flex w-full min-w-0 items-center gap-3 text-left sm:hidden">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[.05] light:bg-black/[.035] text-amber-300 light:text-amber-700">
                        <Plus size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white light:text-slate-900">Top-up #{additionsForThis.length - i}</div>
                        <div className="truncate text-[11px] text-slate-500">{formatDate(a.date)}{acc ? ` · ${acc.name}` : ''}</div>
                      </div>
                      <div className="shrink-0 text-sm font-semibold text-amber-300 light:text-amber-700">+{showMoney ? money(a.amount) : '••••'}</div>
                    </div>

                    {/* Desktop: unchanged full row */}
                    <div className="hidden sm:grid sm:grid-cols-[1.4fr_.9fr_.6fr_.6fr_auto] sm:items-center sm:gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.05] light:bg-black/[.035] text-amber-300 light:text-amber-700">
                          <Plus size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-white light:text-slate-900">Top-up #{additionsForThis.length - i}</div>
                          {a.notes && <div className="truncate text-[11px] text-slate-500">{capitalizeFirst(a.notes)}</div>}
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 light:text-slate-500">
                        <span className="inline-block rounded-md bg-white/[.05] light:bg-black/[.035] px-2 py-0.5 text-slate-300 light:text-slate-700">{acc?.name || 'No account'}</span>
                      </div>
                      <div className="text-xs text-slate-500">{formatDate(a.date)}</div>
                      <div className="text-sm font-semibold text-amber-300 light:text-amber-700 sm:text-right">+{showMoney ? money(a.amount) : '••••'}</div>
                      <div className="flex justify-end">
                        {canLogRepayment(role) && <button onClick={() => deleteAddition(a)} className="rounded-lg p-1.5 text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={13} /></button>}
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
