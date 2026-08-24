'use client'

import { ArrowDownRight, ChevronRight, Target, Trash2, Unlock } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { categoryBreakdown, monthLabel, planTotals } from '@/lib/budgets'
import { money } from '@/lib/format'

export function BudgetMonthDetailView({ plan, lines, categories, transactions, onBack, onReopen, onDelete }) {
  const { budgeted, spent, remaining, pct } = planTotals(plan, transactions)
  const breakdown = categoryBreakdown(plan, lines, categories, transactions)

  return (
    <div className="space-y-5 pb-8">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"><ChevronRight size={14} className="rotate-180" /> Back to budgets</button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-white">{monthLabel(plan.year, plan.month)}</h1>
            <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-300">Closed</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">Closed on {plan.closed_at ? new Date(plan.closed_at).toLocaleDateString() : '—'}</div>
        </div>
        <div className="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto">
          <button onClick={() => onReopen(plan)} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5"><Unlock size={14} />Reopen</button>
          <button onClick={() => onDelete(plan)} className="rounded-xl border border-white/10 p-2.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={15} /></button>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
        <div className="text-xs uppercase tracking-widest text-slate-500">{remaining >= 0 ? 'Came in under by' : 'Went over by'}</div>
        <div className={`mt-1 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[1.1] tracking-[-0.01em] ${remaining >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{money(Math.abs(remaining))}</div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/[.04] p-3.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-400"><Target size={13} />Budgeted</div>
            <div className="mt-1 text-lg font-semibold text-white">{money(budgeted)}</div>
          </div>
          <div className="rounded-2xl bg-white/[.04] p-3.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-400"><ArrowDownRight size={13} />Spent</div>
            <div className="mt-1 text-lg font-semibold text-rose-300">{money(spent)}</div>
            <div className="text-[11px] text-slate-500">{pct}% of budget</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.035]">
        <div className="border-b border-white/10 px-5 py-3 text-xs uppercase tracking-widest text-slate-500">Category breakdown · {breakdown.length}</div>
        {breakdown.length === 0 ? (
          <EmptyState compact icon={Target} title="No categories set" message="This month's budget had no category breakdown." />
        ) : (
          <div className="divide-y divide-white/5">
            {breakdown.map((b) => {
              const tone = b.pct >= 100 ? 'bg-rose-400' : b.pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'
              const text = b.pct >= 100 ? 'text-rose-300' : b.pct >= 80 ? 'text-amber-300' : 'text-emerald-300'
              return (
                <div key={b.line.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: b.category?.color || '#94a3b8' }} />
                      <span className="text-sm font-medium text-white">{b.category?.name || 'Category'}</span>
                    </div>
                    <div className="text-sm text-slate-300">{money(b.spent)} <span className="text-slate-500">of {money(b.budgeted)}</span></div>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5"><div className={`h-full rounded-full ${tone}`} style={{ width: `${b.pct}%` }} /></div>
                  <div className={`mt-1.5 text-xs ${text}`}>{b.pct >= 100 ? `Over by ${money(b.spent - b.budgeted)}` : `${b.pct}% used`}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
