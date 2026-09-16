'use client'

import { useEffect, useState } from 'react'
import { Coins, Eye, EyeOff, History, Plus } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { HeroStatTile } from '@/components/shared/HeroStatTile'
import { formatDate, money } from '@/lib/format'
import { ChitFundDetailView } from '@/features/chit-funds/ChitFundDetailView'

// Net contribution paid so far for one fund = gross amount minus any dividend received against
// each payment (PRD's auction/discount handling) — same formula app/page.js's DashboardView uses
// for the net-worth receivable sum, kept in sync here so the list's own numbers always agree.
function netPaid(payments, fundId) {
  return payments.filter((p) => p.chit_fund_id === fundId).reduce((s, p) => s + Number(p.amount) - Number(p.dividend_received || 0), 0)
}

export function ChitFundsView({ data, onAdd, onEdit, onDelete, onLogPayment, onEditPayment, onTakePayout, onUndoPayout, onComplete, onReopen, onDeletePayment, showMoney, onToggleMoney, toast, onDetailChange, initialSelectedId }) {
  const { chit_funds = [], chit_fund_payments = [], accounts } = data
  const [showHistory, setShowHistory] = useState(false)
  const [selectedId, setSelectedId] = useState(initialSelectedId ?? null)
  const selected = chit_funds.find((c) => c.id === selectedId)
  useEffect(() => { onDetailChange?.(selectedId) }, [selectedId])

  if (selected) {
    return (
      <ChitFundDetailView
        fund={selected}
        payments={chit_fund_payments}
        accounts={accounts}
        onBack={() => setSelectedId(null)}
        onEdit={onEdit}
        onDelete={(c) => { onDelete(c); setSelectedId(null) }}
        onLogPayment={onLogPayment}
        onEditPayment={onEditPayment}
        onTakePayout={onTakePayout}
        onUndoPayout={onUndoPayout}
        onComplete={onComplete}
        onReopen={onReopen}
        onDeletePayment={onDeletePayment}
        showMoney={showMoney}
        onToggleMoney={onToggleMoney}
        toast={toast}
      />
    )
  }

  const active = chit_funds.filter((c) => c.status !== 'completed')
  const totalReceivable = active.filter((c) => c.payout_status === 'not_taken').reduce((s, c) => s + netPaid(chit_fund_payments, c.id), 0)
  const totalLiability = active.filter((c) => c.payout_status === 'taken').reduce((s, c) => {
    const monthsPaid = chit_fund_payments.filter((p) => p.chit_fund_id === c.id).length
    return s + Math.max(0, Number(c.duration_months) - monthsPaid) * Number(c.monthly_contribution)
  }, 0)
  // Completed funds just pile up clutter once you've been using this a while — hide them by
  // default and let "View history" bring them back on demand, same as Lend/Borrow's settled-
  // records toggle.
  const visible = showHistory ? chit_funds : active
  const completedCount = chit_funds.length - active.length

  const card = (c) => {
    const monthsPaid = chit_fund_payments.filter((p) => p.chit_fund_id === c.id).length
    const pct = Number(c.duration_months) > 0 ? Math.min(100, Math.round((monthsPaid / Number(c.duration_months)) * 100)) : 0
    const isCompleted = c.status === 'completed'
    const isTaken = c.payout_status === 'taken'
    const paid = netPaid(chit_fund_payments, c.id)
    const remaining = Math.max(0, Number(c.duration_months) - monthsPaid) * Number(c.monthly_contribution)
    return (
      <div key={c.id} onClick={() => setSelectedId(c.id)} className={`cursor-pointer rounded-2xl border p-5 transition ${isCompleted ? 'border-white/5 light:border-black/5 bg-white/[.02] light:bg-black/[.02] hover:bg-white/[.035] hover:light:bg-black/[.025]' : isTaken ? 'border-amber-400/10 bg-amber-500/[.03] hover:bg-white/[.02] hover:light:bg-black/[.02]' : 'border-accent-300/10 bg-accent-400/[.03] hover:bg-white/[.02] hover:light:bg-black/[.02]'}`}>
        <div className="flex items-center gap-2">
          <div className="text-base font-semibold text-white light:text-slate-900">{c.name}</div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${isCompleted ? 'bg-slate-500/15 text-slate-400 light:text-slate-500' : isTaken ? 'bg-amber-400/15 text-amber-200 light:text-amber-700' : 'bg-accent-400/15 text-accent-200 light:text-accent-700'}`}>{isTaken ? 'Payout Taken' : 'Not Taken'}</span>
          {isCompleted && <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-slate-400 light:text-slate-500">Completed</span>}
        </div>
        <div className="mt-1 text-xs text-slate-500">{money(c.monthly_contribution)}/mo · {formatDate(c.start_date)}</div>
        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <div className="text-xs text-slate-500">{isTaken ? 'Outstanding liability' : 'Receivable'}</div>
            <div className={`text-2xl font-semibold ${isCompleted ? 'text-slate-300 light:text-slate-700' : 'text-white light:text-slate-900'}`}>{showMoney ? money(isTaken ? remaining : paid) : '••••'}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">{monthsPaid} of {c.duration_months} months paid</div>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
          <div className={`h-full rounded-full transition-all ${isCompleted ? 'bg-slate-500' : isTaken ? 'bg-amber-400' : 'bg-accent-400'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-accent-200/70 light:text-accent-700">Rotating savings</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white light:text-slate-900">Chit funds</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowHistory((v) => !v)} className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition sm:flex-none ${showHistory ? 'border-accent-300/50 bg-accent-400/10 text-accent-200 light:text-accent-700' : 'border-white/10 light:border-black/10 text-slate-400 light:text-slate-500 hover:bg-white/5'}`}>
            <History size={15} />{showHistory ? 'Hide completed' : 'View history'}
          </button>
          <button onClick={onAdd} className="hidden flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-4 py-2.5 text-sm font-semibold text-[#07101c] sm:flex-none lg:flex"><Plus size={15} />Add</button>
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      {chit_funds.length > 0 && (
        <div className="rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] glassy:glass-card p-6">
          <div className="grid grid-cols-2 gap-3">
            <HeroStatTile label="Total receivable" value={showMoney ? money(totalReceivable) : '••••'} valueTone="text-accent-300 light:text-accent-700" sub="Not yet taken payout" />
            <HeroStatTile label="Total remaining dues" value={showMoney ? money(totalLiability) : '••••'} valueTone="text-amber-300 light:text-amber-700" sub="Payout already taken" />
          </div>
        </div>
      )}

      {chit_funds.length === 0 ? (
        <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card">
          <EmptyState icon={Coins} title="No chit funds yet" message="Track a chit fund you're a member of — monthly payments, payout, and how it affects your net worth." cta="Add first chit fund" onCta={onAdd} />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card">
          <EmptyState icon={Coins} title="All completed" message={`${completedCount} chit fund${completedCount === 1 ? '' : 's'} completed. Tap "View history" to see them.`} />
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,400px))]">{visible.map(card)}</div>
      )}
    </div>
  )
}
