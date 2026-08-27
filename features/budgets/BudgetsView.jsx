'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Calendar, Eye, EyeOff, Lock, Pencil, Plus, Target, Trash2, TrendingUp, Upload, X } from 'lucide-react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { EmptyState } from '@/components/shared/EmptyState'
import { HeroStatTile } from '@/components/shared/HeroStatTile'
import { budgetInsights, categoryBreakdown, monthLabel, planTotals } from '@/lib/budgets'
import { downloadBudgetsExport } from '@/lib/exportBudgets'
import { money } from '@/lib/format'
import { BudgetMonthDetailView } from '@/features/budgets/BudgetMonthDetailView'

export function BudgetsView({ data, onSetMonth, onCloseMonth, onReopenMonth, onDeleteMonth, onAddYearly, onEditYearly, onDeleteYearly, showMoney, onToggleMoney }) {
  const { budgets = [], budget_months = [], budget_month_categories = [], categories, transactions } = data
  const now = new Date()
  const [selectedClosedId, setSelectedClosedId] = useState(null)
  // Dismissing sticks per budget line in localStorage (same pattern as CreditCardBillAlert) — this
  // view remounts every time you navigate away and back, so component-local state alone forgot the
  // dismissal on every module switch. Keying by budget_month_category id means it naturally clears
  // once that line no longer exists (plan edited/deleted) or a new month's lines are generated.
  const DISMISS_KEY = 'dismissedBudgetInsights'
  const [dismissedInsights, setDismissedInsights] = useState(new Set())
  useEffect(() => {
    try { setDismissedInsights(new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]'))) } catch { /* ignore */ }
  }, [])
  const dismissInsight = (lineId) => {
    setDismissedInsights((d) => {
      const next = new Set(d).add(lineId)
      try { localStorage.setItem(DISMISS_KEY, JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }

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
  const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = Math.max(0, daysInCurrentMonth - now.getDate())

  return (
    // pb-28 (not the pb-16 used by Accounts) — this page's last section (Yearly budgets) ends in
    // its own small "+ Add" button, which needs more clearance than a plain list to avoid sitting
    // under the fixed bottom nav + floating add button, confirmed via a real scrolled screenshot.
    <div className="space-y-5 pb-28">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-accent-200/70 light:text-accent-700">Guardrails</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white light:text-slate-900">Budgets</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadBudgetsExport({ budgetMonths: budget_months, budgetMonthCategories: budget_month_categories, yearlyBudgets, categories, transactions }, new Date().toISOString().slice(0, 10))}
            disabled={budget_months.length === 0 && yearlyBudgets.length === 0}
            title="Export"
            className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 light:text-slate-500 transition hover:bg-white/5 hover:text-slate-200 hover:light:text-slate-700 disabled:opacity-50"
          ><Upload size={14} /><span className="hidden sm:inline">Export</span></button>
          <button onClick={() => onSetMonth(nextMonth.getFullYear(), nextMonth.getMonth())} className="flex items-center justify-center gap-2 rounded-xl bg-white/[.06] light:bg-black/[.04] px-4 py-2.5 text-sm font-semibold text-white light:text-slate-900 transition hover:bg-white/[.1] hover:light:bg-black/[.06]"><Plus size={14} />Plan a month</button>
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] glassy:glass-card p-6">
        {/* Status (Remaining/Over-by) sits with the header's action buttons on the right — the
            same "badge next to the title row" spot every other detail view (e.g. Loan's "Active"
            badge) uses, instead of stacked under the hero figure where it left a dead gap between
            the figure and the stat tiles. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-white light:text-slate-900">{monthLabel(now.getFullYear(), now.getMonth())}</div>
          {activePlan && (
            <div className="flex flex-wrap items-center gap-3">
              {activeTotals.remaining >= 0 ? (
                <div className="text-sm text-emerald-300 light:text-emerald-700">Remaining {showMoney ? money(activeTotals.remaining) : '••••'}</div>
              ) : (
                // Same border + 5%-wash + tinted-text Status Banner pattern as the insights list
                // below and CreditCardBillAlert — the headline overspend figure gets the same
                // alarm treatment the app already uses for every other overdue/over-budget signal,
                // instead of plain tinted text that reads no more urgent than "on track."
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300/25 bg-rose-300/5 px-3 py-1.5 text-sm font-medium text-rose-200 light:text-rose-700">
                  <AlertTriangle size={13} className="shrink-0" />
                  Over by {showMoney ? money(Math.abs(activeTotals.remaining)) : '••••'}
                </div>
              )}
              <div className="flex items-center gap-2">
                <button onClick={() => onSetMonth(activePlan.year, activePlan.month)} className="flex items-center gap-1.5 rounded-lg border border-white/10 light:border-black/10 px-3 py-1.5 text-xs font-medium text-slate-300 light:text-slate-700 hover:bg-white/5"><Pencil size={12} />Edit</button>
                <button onClick={() => onCloseMonth(activePlan)} className="flex items-center gap-1.5 rounded-lg bg-white/[.06] light:bg-black/[.04] px-3 py-1.5 text-xs font-semibold text-white light:text-slate-900 hover:bg-white/[.1] hover:light:bg-black/[.06]"><Lock size={12} />Close month</button>
                <button onClick={() => onDeleteMonth(activePlan)} title="Delete month" className="rounded-lg p-1.5 text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={14} /></button>
              </div>
            </div>
          )}
        </div>

        {!activePlan ? (
          <EmptyState compact icon={Target} title="No budget set for this month" message="Set an overall monthly budget and however many category limits you want, all together." cta="Set this month's budget" onCta={() => onSetMonth(now.getFullYear(), now.getMonth())} />
        ) : (
          <>
            {/* Same stacked hero-figure-then-tile-row shape as AccountsView's "Total balance"
                card — matching the pattern already established across the app's other module
                dashboards, rather than a one-off side-by-side split just for this page. */}
            <div className="mt-5">
              <div className="text-xs uppercase tracking-widest text-slate-400">Budgeted</div>
              <div className="mt-1 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[1.1] tracking-[-0.01em] text-white light:text-slate-900">{showMoney ? money(activeTotals.budgeted) : '••••••'}</div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <HeroStatTile
                  icon={TrendingUp}
                  label="Spent so far"
                  value={showMoney ? money(activeTotals.spent) : '••••'}
                  valueTone="text-rose-300 light:text-rose-700"
                  sub={`${activeTotals.pct}% of budget`}
                />
                {/* Days left, not a repeat of "Over by"/"Remaining" already shown in the header
                    above — this slot used to just restate the same figure a second time. */}
                <HeroStatTile
                  icon={Calendar}
                  label="Days left"
                  value={`${daysLeft}`}
                  sub={`${now.getDate()} of ${daysInCurrentMonth} days used`}
                />
              </div>
            </div>

            {/* Insights, when present, get their own full-width row above — pairing them with
                the breakdown as fixed lg: columns meant the breakdown fell into column 1 alone
                (a dismissible, often-empty section) whenever insights were dismissed/absent,
                leaving column 2 permanently empty instead of ever holding real content. */}
            {insights.filter((ins) => !dismissedInsights.has(ins.line.id)).length > 0 && (
              <div className="mt-4 space-y-2">
                {insights.filter((ins) => !dismissedInsights.has(ins.line.id)).map((ins) => (
                  <div key={ins.line.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300/25 bg-amber-300/5 px-4 py-2.5 text-xs text-amber-200 light:text-amber-700">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                      <span>
                        <b>{ins.category?.name}</b>{' '}
                        {ins.overPace
                          ? <>is trending over — at this pace, ~{money(ins.projected)} by month end against a {money(ins.budgeted)} budget.</>
                          : <>has gone over budget {ins.streak} months running.</>}
                        {ins.overPace && ins.streak >= 2 && ` Over budget ${ins.streak} months running.`}
                        {ins.vsLastMonth && <span className="text-amber-200/70 light:text-amber-700"> · {money(ins.vsLastMonth.spent)} last month</span>}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button type="button" onClick={() => onSetMonth(activePlan.year, activePlan.month)} className="rounded-lg bg-amber-300/20 px-2.5 py-1 text-[11px] font-semibold text-amber-100 light:text-amber-800 hover:bg-amber-300/30">Adjust budget</button>
                      <button type="button" onClick={() => dismissInsight(ins.line.id)} className="rounded-lg p-1 opacity-60 transition hover:bg-white/10 hover:opacity-100" title="Dismiss"><X size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Breakdown list + a spend-share donut sit side by side at lg:+ — the donut always
                fills this slot (unlike insights above, it isn't dismissible or conditional on
                pace), so there's no longer a permanently empty column next to the list. */}
            {activeBreakdown.length > 0 && (
              <div className="mt-5 lg:grid lg:grid-cols-[1.3fr_1fr] lg:items-start lg:gap-6">
                <div className="space-y-3">
                  {activeBreakdown.map((b) => {
                    const tone = b.pct >= 100 ? 'bg-rose-400' : b.pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'
                    return (
                      <div key={b.line.id}>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          {/* No decorative category-color dot here — the bar right below already
                              carries meaning through color (status, not category identity); a
                              second, unrelated color per row forced a text read on every line. */}
                          <span className="text-white light:text-slate-900">{b.category?.name || 'Category'}</span>
                          <div className="text-slate-400 light:text-slate-500">{showMoney ? `${money(b.spent)} of ${money(b.budgeted)}` : '••••'}</div>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5"><div className={`h-full rounded-full ${tone}`} style={{ width: `${b.pct}%` }} /></div>
                      </div>
                    )
                  })}
                </div>

                {(() => {
                  const spendMix = activeBreakdown.filter((b) => b.spent > 0).map((b) => ({ name: b.category?.name || 'Category', value: b.spent, color: b.category?.color || '#94a3b8' }))
                  return spendMix.length === 0 ? null : (
                    // Same proven h-72/radii shape as Insights' "Where money goes" donut
                    // (features/insights/InsightsView.jsx) — the previous narrow `max-w-[280px]`
                    // cap left too little height for the pie *and* the wrapping category-name
                    // legend at once, clipping the chart into the "broken" render.
                    <div className="mt-6 min-w-0 lg:mt-0">
                      <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Spend split</div>
                      <div className="mt-2 h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={spendMix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} stroke="none">
                              {spendMix.map((s, i) => <Cell key={i} fill={s.color} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#0f1420', border: '1px solid #ffffff22', borderRadius: 12, color: '#fff' }} formatter={(v) => showMoney ? money(v) : '••••'} />
                            <Legend iconType="circle" wrapperStyle={{ color: '#94a3b8', fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </>
        )}
      </div>

      {upcomingPlans.length > 0 && (
        <div>
          <div className="mb-3 text-xs uppercase tracking-widest text-slate-400">Other planned months · {upcomingPlans.length}</div>
          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(220px,320px))]">
            {upcomingPlans.map((p) => {
              const t = planTotals(p, transactions)
              const isFuture = p.year > now.getFullYear() || (p.year === now.getFullYear() && p.month > now.getMonth())
              return (
                <div key={p.id} onClick={() => onSetMonth(p.year, p.month)} className="cursor-pointer rounded-2xl border border-accent-300/15 bg-accent-300/[.03] p-5 transition hover:border-accent-300/30 hover:bg-accent-300/[.06]">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-accent-300/70 light:text-accent-700" />
                    <div className="text-sm font-semibold text-white light:text-slate-900">{monthLabel(p.year, p.month)}</div>
                    <span className="rounded-full bg-accent-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-accent-200 light:text-accent-700">{isFuture ? 'Upcoming' : 'Reopened'}</span>
                  </div>
                  <div className="mt-3 text-xl font-semibold text-white light:text-slate-900">{showMoney ? money(t.budgeted) : '••••'}</div>
                  <div className="text-xs text-slate-400">{isFuture ? 'Planned' : `${money(t.spent)} spent so far`}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {closedPlans.length > 0 && (
        <div>
          <div className="mb-3 text-xs uppercase tracking-widest text-slate-400">Past months · {closedPlans.length}</div>
          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(220px,320px))]">
            {closedPlans.map((p) => {
              const t = planTotals(p, transactions)
              const tone = t.pct >= 100 ? 'text-rose-300 light:text-rose-700' : t.pct >= 80 ? 'text-amber-300 light:text-amber-700' : 'text-emerald-300 light:text-emerald-700'
              return (
                <div key={p.id} onClick={() => setSelectedClosedId(p.id)} className="cursor-pointer rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-5 transition hover:border-accent-300/30 hover:bg-white/[.05] hover:light:bg-black/[.035]">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-500" />
                    <div className="text-sm font-semibold text-white light:text-slate-900">{monthLabel(p.year, p.month)}</div>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <div className="text-xl font-semibold text-white light:text-slate-900">{showMoney ? money(t.spent) : '••••'}</div>
                    <div className="text-xs text-slate-400">of {showMoney ? money(t.budgeted) : '••••'}</div>
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
          <div className="text-xs uppercase tracking-widest text-slate-400">Yearly budgets</div>
          <button onClick={onAddYearly} className="flex items-center gap-1.5 rounded-lg bg-white/[.06] light:bg-black/[.04] px-2.5 py-1.5 text-xs font-semibold text-white light:text-slate-900 hover:bg-white/[.1] hover:light:bg-black/[.06]"><Plus size={13} />Add</button>
        </div>
        {yearlyBudgets.length === 0 ? (
          <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02] px-5 py-6 text-sm text-slate-400">No yearly budgets set.</div>
        ) : (
          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(220px,320px))]">
            {yearlyBudgets.map((b) => {
              const cat = categories.find((c) => c.id === b.category_id)
              const yearKey = `${now.getFullYear()}`
              const spent = transactions.filter((t) => t.type === 'expense' && t.category_id === b.category_id && String(new Date(t.date).getFullYear()) === yearKey).reduce((s, t) => s + Number(t.amount || 0), 0)
              const limit = Number(b.amount || 0)
              const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0
              const tone = pct >= 100 ? 'bg-rose-400' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'
              const text = pct >= 100 ? 'text-rose-300 light:text-rose-700' : pct >= 80 ? 'text-amber-300 light:text-amber-700' : 'text-emerald-300 light:text-emerald-700'
              return (
                <div key={b.id} className="group rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl" style={{ background: `${cat?.color || '#94a3b8'}22`, color: cat?.color }} />
                      <div>
                        <div className="text-sm font-semibold text-white light:text-slate-900">{cat?.name || 'Category'}</div>
                        <div className="text-[11px] capitalize text-slate-400">yearly</div>
                      </div>
                    </div>
                    {/* lg:group-focus-within alongside lg:group-hover — hover-only reveal left a
                        keyboard user tabbing onto a functionally-present but invisible control. */}
                    <div className="flex gap-1 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                      <button onClick={() => onEditYearly(b)} title="Edit" className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900"><Pencil size={14} /></button>
                      <button onClick={() => onDeleteYearly(b)} title="Delete" className="rounded-lg p-1.5 text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="mt-5 flex items-baseline justify-between">
                    <div className="text-2xl font-semibold tracking-tight text-white light:text-slate-900">{showMoney ? money(spent) : '••••'}</div>
                    <div className="text-xs text-slate-400">of {showMoney ? money(limit) : '••••'}</div>
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
