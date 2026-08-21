'use client'

import { ArrowDownRight, ArrowUpRight, ChevronRight, Eye, EyeOff, Pencil, Target, Trash2, User } from 'lucide-react'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate, money } from '@/lib/format'

export function LendBorrowDetailView({ record, repayments, accounts, transactions, onBack, onEdit, onDelete, onDeleteTx, showMoney, onToggleMoney }) {
  const isLent = record.type === 'lent'
  const repaid = Number(record.amount_repaid || 0)
  const pending = Math.max(0, Number(record.amount) - repaid)
  const pct = Number(record.amount) > 0 ? Math.min(100, Math.round((repaid / Number(record.amount)) * 100)) : 0
  const overdue = record.due_date && record.status !== 'returned' && new Date(record.due_date) < new Date()
  const account = accounts.find((a) => a.id === record.from_account_id)
  const paymentsForThis = repayments
    .filter((r) => r.lend_borrow_id === record.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const deletePayment = (r) => {
    const tx = transactions.find((t) => t.id === r.linked_transaction_id)
    if (tx) onDeleteTx(tx)
  }

  return (
    <div className="space-y-5 pb-8">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"><ChevronRight size={14} className="rotate-180" /> Back to lend &amp; borrow</button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${isLent ? 'bg-emerald-400/15 text-emerald-200' : 'bg-rose-400/15 text-rose-200'}`}>
            <User size={22} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-lg font-semibold text-white">{record.person_name}</div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${isLent ? 'bg-emerald-400/15 text-emerald-200' : 'bg-rose-400/15 text-rose-200'}`}>{isLent ? 'lent' : 'borrowed'}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${record.status === 'returned' ? 'bg-emerald-400/15 text-emerald-200' : record.status === 'partial' ? 'bg-amber-400/15 text-amber-200' : 'bg-cyan-400/15 text-cyan-200'}`}>{record.status}</span>
              {overdue && <span className="rounded-full bg-rose-400/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-rose-200">overdue</span>}
            </div>
            <div className="mt-1 text-xs text-slate-500">{record.reason || (isLent ? 'Lent' : 'Borrowed')} · {formatDate(record.date)}{account ? ` · ${account.name}` : ''}{record.due_date ? ` · due ${formatDate(record.due_date)}` : ''}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onEdit(record)} className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5 hover:text-white"><Pencil size={15} /></button>
          <button onClick={() => onDelete(record)} className="rounded-xl border border-white/10 p-2.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={15} /></button>
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={isLent ? 'They still owe you' : 'You still owe'} value={showMoney ? money(pending) : '••••'} icon={isLent ? ArrowUpRight : ArrowDownRight} accent={isLent ? 'bg-emerald-400/15 text-emerald-200' : 'bg-rose-400/15 text-rose-200'} tone={isLent ? 'text-emerald-300' : 'text-rose-300'} sub={<span>of {money(record.amount)} total</span>} />
        <StatCard label={isLent ? 'Repaid to you' : 'Paid by you'} value={showMoney ? money(repaid) : '••••'} icon={isLent ? ArrowDownRight : ArrowUpRight} accent="bg-cyan-300/15 text-cyan-200" sub={<span>{paymentsForThis.length} payment{paymentsForThis.length === 1 ? '' : 's'}</span>} />
        <StatCard label="Settled" value={`${pct}%`} icon={Target} accent="bg-violet-400/15 text-violet-200" tone={pct >= 100 ? 'text-emerald-300' : pct > 0 ? 'text-amber-300' : 'text-slate-400'} sub={<span>{pct >= 100 ? 'Fully settled' : 'In progress'}</span>} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5">
          <div className={`h-full rounded-full transition-all ${isLent ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.035]">
        <div className="border-b border-white/10 px-5 py-3 text-xs uppercase tracking-widest text-slate-500">{isLent ? 'Repayments received' : 'Payments made'} · {paymentsForThis.length}</div>
        {paymentsForThis.length === 0 ? (
          <EmptyState compact icon={isLent ? ArrowDownRight : ArrowUpRight} title="No payments yet" message="Log a repayment as an income or expense transaction linked to this record." />
        ) : (
          <>
            <div className="hidden grid-cols-[1.4fr_.9fr_.6fr_.6fr_auto] gap-4 border-b border-white/10 px-5 py-2.5 text-[10px] uppercase tracking-widest text-slate-600 sm:grid">
              <span>Payment</span>
              <span>Account</span>
              <span>Date</span>
              <span className="text-right">Amount</span>
              <span />
            </div>
            <div className="max-h-96 divide-y divide-white/5 overflow-y-auto">
              {paymentsForThis.map((r, i) => {
                const acc = accounts.find((a) => a.id === r.account_id)
                return (
                  <div key={r.id} className="grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-[1.4fr_.9fr_.6fr_.6fr_auto] sm:items-center sm:gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.05] ${isLent ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {isLent ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">Payment #{paymentsForThis.length - i}</div>
                        {r.notes && <div className="truncate text-[11px] text-slate-500">{r.notes}</div>}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      <span className="inline-block rounded-md bg-white/[.05] px-2 py-0.5 text-slate-300">{acc?.name || 'No account'}</span>
                    </div>
                    <div className="text-xs text-slate-500">{formatDate(r.date)}</div>
                    <div className={`text-sm font-semibold sm:text-right ${isLent ? 'text-emerald-300' : 'text-rose-300'}`}>{isLent ? '+' : '-'}{showMoney ? money(r.amount) : '••••'}</div>
                    <div className="flex justify-end">
                      <button onClick={() => deletePayment(r)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={13} /></button>
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
