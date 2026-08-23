'use client'

import { useState } from 'react'
import { AlertTriangle, Calendar, Eye, EyeOff, Lock, Pencil, Plus, Target, Trash2, TrendingUp, Upload, X } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { budgetInsights, categoryBreakdown, monthLabel, planTotals } from '@/lib/budgets'
import { downloadBudgetsExport } from '@/lib/exportBudgets'
import { money } from '@/lib/format'
import { BudgetMonthDetailView } from '@/features/budgets/BudgetMonthDetailView'

export function BudgetsView({ data, onSetMonth, onCloseMonth, onReopenMonth, onDeleteMonth, onAddYearly, onEditYearly, onDeleteYearly, showMoney, onToggleMoney }) {
  const { budgets = [], budget_months = [], budget_month_categories = [], categories, transactions } = data
  const now = new Date()
  const [selectedClosedId, setSelectedClosedId] = useState(null)
  // Dismissing an insight just hides it for this visit — it reappears next time you're back here
  // if the category's still trending over, same as every other status banner in the app.
  const [dismissedInsights, setDismissedInsights] = useState(new Set())

  const linesFor = (planId) => budget_month_categories.filter((l) => l.budget_month_id === planId)
  const activePlan = budget_months.find((p) => p.status === 'active' && p.year === now.getFullYear() && p.month === now.getMonth())
  // Active plans for any OTHER month — a future one set up ahead of time, or a past one reopened
  // for editing. Neither belongs in the "current month" slot, which is always the real month.
  const upcomingPlans = budget_months.filter((p) => p.status === 'active' && p !== activePlan && !(p.year === now.getFullYear() && p.month === now.getMonth())).sort((a, b) => (a.year - b.year) || (a.month - b.month))
  const closedPlans = budget_months.filter((p) => p.status === 'closed').sort((a, b) => (b.year - a.year) || (b.month - a.month))
  const selectedClosed = closedPlans.find((p) => p.id === selectedClosedId)
  const yearlyBudgets = budgets.filter((b) => b.period === 'yearly')

  if (selectedClosed) {
    return (
      <BudgetMonthDetailView
        plan={selectedClosed}
        lines={linesFor(selectedClosed.id)}
        categories={categories}
        transactions={transactions}
        onBack={() => setSelectedClosedId(null)}
        onReopen={(p) => { onReopenMonth(p); setSelectedClosedId(null) }}
        onDelete={(p) => { onDeleteMonth(p); setSelectedClosedId(null) }}
      />
    )
  }

  const activeLines = activePlan ? linesFor(activePlan.id) : []
  const activeTotals = activePlan ? planTotals(activePlan, transactions) : null
  const activeBreakdown = activePlan ? categoryBreakdown(activePlan, activeLines, categories, transactions) : []
  const insights = activePlan ? budgetInsights(activePlan, activeLines, budget_months, budget_month_categories, categories, transactions) : []

  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Guardrails</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Budgets</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => downloadBudgetsExport({ budgetMonths: budget_months, budgetMonthCategories: budget_month_categories, yearlyBudgets, categories, transactions }, new Date().toISOString().slice(0, 10))}
            disabled={budget_months.length === 0 && yearlyBudgets.length === 0}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 disabled:opacity-50"
          ><Upload size={14} />Export</button>
          <button onClick={() => onSetMonth(nextMonth.getFullYear(), nextMonth.getMonth())} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5"><Plus size={14} />Plan a month</button>
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-white">{monthLabel(now.getFullYear(), now.getMonth())}</div>
          {activePlan && (
            <div className="flex items-center gap-2">
              <button onClick={() => onSetMonth(activePlan.year, activePlan.month)} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/5"><Pencil size={12} />Edit</button>
              <button onClick={() => onCloseMonth(activePlan)} className="flex items-center gap-1.5 rounded-lg bg-white/[.06] px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/[.1]"><Lock size={12} />Close month</button>
              <button onClick={() => onDeleteMonth(activePlan)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={14} /></button>
            </div>
          )}
        </div>

        {!activePlan ? (
          <EmptyState compact icon={Target} title="No budget set for this month" message="Set an overall monthly budget and however many category limits you want, all together." cta="Set this month's budget" onCta={() => onSetMonth(now.getFullYear(), now.getMonth())} />
        ) : (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <StatCard label="Budgeted" value={showMoney ? money(activeTotals.budgeted) : '••••'} icon={Target} accent="bg-violet-400/15 text-violet-200" />
              <StatCard label="Spent so far" value={showMoney ? money(activeTotals.spent) : '••••'} icon={TrendingUp} accent="bg-rose-400/15 text-rose-200" tone="text-rose-300" sub={<span>{activeTotals.pct}% of budget</span>} />
              <StatCard label={activeTotals.remaining >= 0 ? 'Remaining' : 'Over by'} value={showMoney ? money(Math.abs(activeTotals.remaining)) : '••••'} icon={Target} accent={activeTotals.remaining >= 0 ? 'bg-emerald-400/15 text-emerald-200' : 'bg-rose-400/15 text-rose-200'} tone={activeTotals.remaining >= 0 ? 'text-emerald-300' : 'text-rose-300'} />
            </div>

            {insights.filter((ins) => !dismissedInsights.has(ins.line.id)).length > 0 && (
              <div className="mt-4 space-y-2">
                {insights.filter((ins) => !dismissedInsights.has(ins.line.id)).map((ins) => (
                  <div key={ins.line.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300/25 bg-amber-300/5 px-4 py-2.5 text-xs text-amber-200">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                      <span>
                        <b>{ins.category?.name}</b>{' '}
                        {ins.overPace
                          ? <>is trending over — at this pace, ~{money(ins.projected)} by month end against a {money(ins.budgeted)} budget.</>
                          : <>has gone over budget {ins.streak} months running.</>}
                        {ins.overPace && ins.streak >= 2 && ` Over budget ${ins.streak} months running.`}
                        {ins.vsLastMonth && <span className="text-amber-200/70"> · {money(ins.vsLastMonth.spent)} last month</span>}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button type="button" onClick={() => onSetMonth(activePlan.year, activePlan.month)} className="rounded-lg bg-amber-300/20 px-2.5 py-1 text-[11px] font-semibold text-amber-100 hover:bg-amber-300/30">Adjust budget</button>
                      <button type="button" onClick={() => setDismissedInsights((d) => new Set(d).add(ins.line.id))} className="rounded-lg p-1 opacity-60 transition hover:bg-white/10 hover:opacity-100" title="Dismiss"><X size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeBreakdown.length > 0 && (
              <div className="mt-5 space-y-3">
                {activeBreakdown.map((b) => {
                  const tone = b.pct >= 100 ? 'bg-rose-400' : b.pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'
                  return (
                    <div key={b.line.id}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: b.category?.color || '#94a3b8' }} />
                          <span className="text-white">{b.category?.name || 'Category'}</span>
                        </div>
                        <div className="text-slate-400">{showMoney ? `${money(b.spent)} of ${money(b.budgeted)}` : '••••'}</div>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5"><div className={`h-full rounded-full ${tone}`} style={{ width: `${b.pct}%` }} /></div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {upcomingPlans.length > 0 && (
        <div>
          <div className="mb-3 text-xs uppercase tracking-widest text-slate-500">Other planned months · {upcomingPlans.length}</div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {upcomingPlans.map((p) => {
              const t = planTotals(p, transactions)
              const isFuture = p.year > now.getFullYear() || (p.year === now.getFullYear() && p.month > now.getMonth())
              return (
                <div key={p.id} onClick={() => onSetMonth(p.year, p.month)} className="cursor-pointer rounded-2xl border border-cyan-300/15 bg-cyan-300/[.03] p-5 transition hover:border-cyan-300/30 hover:bg-cyan-300/[.06]">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-cyan-300/70" />
                    <div className="text-sm font-semibold text-white">{monthLabel(p.year, p.month)}</div>
                    <span className="rounded-full bg-cyan-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-cyan-200">{isFuture ? 'Upcoming' : 'Reopened'}</span>
                  </div>
                  <div className="mt-3 text-xl font-semibold text-white">{showMoney ? money(t.budgeted) : '••••'}</div>
                  <div className="text-xs text-slate-500">{isFuture ? 'Planned' : `${money(t.spent)} spent so far`}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {closedPlans.length > 0 && (
        <div>
          <div className="mb-3 text-xs uppercase tracking-widest text-slate-500">Past months · {closedPlans.length}</div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {closedPlans.map((p) => {
              const t = planTotals(p, transactions)
              const tone = t.pct >= 100 ? 'text-rose-300' : t.pct >= 80 ? 'text-amber-300' : 'text-emerald-300'
              return (
                <div key={p.id} onClick={() => setSelectedClosedId(p.id)} className="cursor-pointer rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:border-cyan-300/30 hover:bg-white/[.05]">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-500" />
                    <div className="text-sm font-semibold text-white">{monthLabel(p.year, p.month)}</div>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <div className="text-xl font-semibold text-white">{showMoney ? money(t.spent) : '••••'}</div>
                    <div className="text-xs text-slate-500">of {showMoney ? money(t.budgeted) : '••••'}</div>
                  </div>
                  <div className={`mt-1 text-xs ${tone}`}>{t.pct}% used</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-slate-500">Yearly budgets</div>
          <button onClick={onAddYearly} className="flex items-center gap-1.5 rounded-lg bg-white/[.06] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/[.1]"><Plus size={13} />Add</button>
        </div>
        {yearlyBudgets.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[.02] px-5 py-6 text-sm text-slate-500">No yearly budgets set.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {yearlyBudgets.map((b) => {
              const cat = categories.find((c) => c.id === b.category_id)
              const yearKey = `${now.getFullYear()}`
              const spent = transactions.filter((t) => t.type === 'expense' && t.category_id === b.category_id && String(new Date(t.date).getFullYear()) === yearKey).reduce((s, t) => s + Number(t.amount || 0), 0)
              const limit = Number(b.amount || 0)
              const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0
              const tone = pct >= 100 ? 'bg-rose-400' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'
              const text = pct >= 100 ? 'text-rose-300' : pct >= 80 ? 'text-amber-300' : 'text-emerald-300'
              return (
                <div key={b.id} className="group rounded-2xl border border-white/10 bg-white/[.035] p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl" style={{ background: `${cat?.color || '#94a3b8'}22`, color: cat?.color }} />
                      <div>
                        <div className="text-sm font-semibold text-white">{cat?.name || 'Category'}</div>
                        <div className="text-[11px] capitalize text-slate-500">yearly</div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button onClick={() => onEditYearly(b)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={14} /></button>
                      <button onClick={() => onDeleteYearly(b)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="mt-5 flex items-baseline justify-between">
                    <div className="text-2xl font-semibold tracking-tight text-white">{showMoney ? money(spent) : '••••'}</div>
                    <div className="text-xs text-slate-500">of {showMoney ? money(limit) : '••••'}</div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5"><div className={`h-full rounded-full ${tone} transition-all`} style={{ width: `${pct}%` }} /></div>
                  <div className={`mt-2 text-xs ${text}`}>{showMoney ? (pct >= 100 ? `Over budget by ${money(spent - limit)}` : `${pct}% used · ${money(limit - spent)} left`) : `${pct}% used`}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
