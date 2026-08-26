'use client'

import { useState } from 'react'
import { Eye, EyeOff, Heart, History, Plus } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { HeroStatTile } from '@/components/shared/HeroStatTile'
import { formatDate, money } from '@/lib/format'
import { LendBorrowDetailView } from '@/features/lend-borrow/LendBorrowDetailView'

export function LendBorrowView({ data, onAdd, onEdit, onDelete, onDeleteTx, onLogRepayment, onManageAccess, showMoney, onToggleMoney, toast }) {
  const { lend_borrow, lend_repayments, accounts, transactions } = data
  const now = new Date()
  const [showHistory, setShowHistory] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const selected = lend_borrow.find((l) => l.id === selectedId)

  if (selected) {
    return (
      <LendBorrowDetailView
        record={selected}
        repayments={lend_repayments}
        accounts={accounts}
        transactions={transactions}
        onBack={() => setSelectedId(null)}
        onEdit={onEdit}
        onDelete={(l) => { onDelete(l); setSelectedId(null) }}
        onDeleteTx={onDeleteTx}
        onLogRepayment={onLogRepayment}
        onManageAccess={onManageAccess}
        showMoney={showMoney}
        onToggleMoney={onToggleMoney}
        toast={toast}
      />
    )
  }

  const lent = lend_borrow.filter((l) => l.type === 'lent')
  const borrowed = lend_borrow.filter((l) => l.type === 'borrowed')
  const lentPending = lent.reduce((s, l) => s + Math.max(0, Number(l.amount) - Number(l.amount_repaid || 0)), 0)
  const borrowedPending = borrowed.reduce((s, l) => s + Math.max(0, Number(l.amount) - Number(l.amount_repaid || 0)), 0)
  // Fully-settled records just pile up clutter once you've been using this a while — hide them
  // by default and let "View all history" bring them back on demand.
  const visible = showHistory ? lend_borrow : lend_borrow.filter((l) => l.status !== 'returned')
  const closedCount = lend_borrow.length - lend_borrow.filter((l) => l.status !== 'returned').length

  const card = (l) => {
    const isLent = l.type === 'lent'
    const isClosed = l.status === 'returned'
    const repaid = Number(l.amount_repaid || 0)
    const pending = Math.max(0, Number(l.amount) - repaid)
    const pct = Number(l.amount) > 0 ? Math.min(100, Math.round((repaid / Number(l.amount)) * 100)) : 0
    const overdue = l.due_date && l.status !== 'returned' && new Date(l.due_date) < now
    const acc = accounts.find((a) => a.id === l.from_account_id)
    // Lent = money flowing back to you (green, "+"). Borrowed = money flowing out of you
    // to settle the debt (rose, "-") — same progress-bar mechanic, opposite direction of cash.
    // Fully settled ("returned") records mute to gray instead of the lent/borrowed accent —
    // they're history at that point, not something still needing attention.
    return (
      <div key={l.id} onClick={() => setSelectedId(l.id)} className={`cursor-pointer rounded-2xl border p-5 transition ${isClosed ? 'border-white/5 light:border-black/5 bg-white/[.02] light:bg-black/[.02] hover:bg-white/[.035] hover:light:bg-black/[.025]' : isLent ? 'border-emerald-400/10 bg-emerald-500/[.03] hover:bg-white/[.02] hover:light:bg-black/[.02]' : 'border-rose-400/10 bg-rose-500/[.03] hover:bg-white/[.02] hover:light:bg-black/[.02]'}`}>
        <div className="flex items-center gap-2">
          <div className="text-base font-semibold text-white light:text-slate-900">{l.person_name}</div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${isClosed ? 'bg-slate-500/15 text-slate-400 light:text-slate-500' : isLent ? 'bg-emerald-400/15 text-emerald-200 light:text-emerald-700' : 'bg-rose-400/15 text-rose-200 light:text-rose-700'}`}>{isLent ? 'lent' : 'borrowed'}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${isClosed ? 'bg-slate-500/15 text-slate-400 light:text-slate-500' : l.status === 'partial' ? 'bg-amber-400/15 text-amber-200 light:text-amber-700' : 'bg-accent-400/15 text-accent-200 light:text-accent-700'}`}>{l.status}</span>
          {overdue && <span className="rounded-full bg-rose-400/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-rose-200 light:text-rose-700">overdue</span>}
        </div>
        <div className="mt-1 text-xs text-slate-500">{l.reason || (isLent ? 'Lent' : 'Borrowed')} · {formatDate(l.date)}{acc ? ` · ${acc.name}` : ''}{l.due_date ? ` · due ${formatDate(l.due_date)}` : ''}</div>
        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <div className="text-xs text-slate-500">{isLent ? 'They still owe you' : 'You still owe'}</div>
            <div className={`text-2xl font-semibold ${isClosed ? 'text-slate-300 light:text-slate-700' : 'text-white light:text-slate-900'}`}>{showMoney ? money(pending) : '••••'}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">of {showMoney ? money(l.amount) : '••••'}</div>
            <div className={`text-[11px] ${isClosed ? 'text-slate-500' : isLent ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700'}`}>{isLent ? '+' : '-'}{money(repaid)} {isLent ? 'repaid to you' : 'paid by you'}</div>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
          <div className={`h-full rounded-full transition-all ${isClosed ? 'bg-slate-500' : isLent ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    )
  }

  const net = lentPending - borrowedPending

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-accent-200/70 light:text-accent-700">Money between people</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white light:text-slate-900">Lend &amp; borrow</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowHistory((v) => !v)} className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition sm:flex-none ${showHistory ? 'border-accent-300/50 bg-accent-400/10 text-accent-200 light:text-accent-700' : 'border-white/10 light:border-black/10 text-slate-400 light:text-slate-500 hover:bg-white/5'}`}>
            <History size={15} />{showHistory ? 'Hide settled' : 'View all history'}
          </button>
          <button onClick={onAdd} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-4 py-2.5 text-sm font-semibold text-[#07101c] sm:flex-none"><Plus size={15} />Log</button>
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      {lend_borrow.length > 0 && (
        <div className="rounded-3xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025] p-6">
          <div className="text-xs uppercase tracking-widest text-slate-500">{net >= 0 ? 'Net owed to you' : 'Net you owe'}</div>
          <div className="mt-1 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[1.1] tracking-[-0.01em] text-white light:text-slate-900">{showMoney ? money(Math.abs(net)) : '••••••'}</div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <HeroStatTile label="Total lent (pending)" value={showMoney ? money(lentPending) : '••••'} valueTone="text-emerald-300 light:text-emerald-700" sub={`${lent.length} people`} />
            <HeroStatTile label="Total borrowed (pending)" value={showMoney ? money(borrowedPending) : '••••'} valueTone="text-rose-300 light:text-rose-700" sub={`${borrowed.length} people`} />
          </div>
        </div>
      )}

      {lend_borrow.length === 0 ? (
        <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025]">
          <EmptyState icon={Heart} title="Nothing to track" message="Log money you've lent to friends or borrowed from someone." cta="Add first record" onCta={onAdd} />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025]">
          <EmptyState icon={Heart} title="All settled" message={`${closedCount} record${closedCount === 1 ? '' : 's'} fully repaid. Tap "View all history" to see them.`} />
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,400px))]">{visible.map(card)}</div>
      )}
    </div>
  )
}
