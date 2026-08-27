'use client'

import { PiggyBank, Sparkles, Tag, TrendingDown, TrendingUp } from 'lucide-react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { StatCard } from '@/components/shared/StatCard'
import { HeroStatTile } from '@/components/shared/HeroStatTile'
import { EmptyState } from '@/components/shared/EmptyState'
import { money } from '@/lib/format'

export function InsightsView({ data }) {
  const { transactions, categories } = data
  const now = new Date()
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`
  const monthTx = transactions.filter((t) => {
    const d = new Date(t.date); return `${d.getFullYear()}-${d.getMonth()}` === monthKey && t.type !== 'transfer'
  })
  const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0)
  const expense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0)
  const savings = income - expense
  const rate = income > 0 ? Math.round((savings / income) * 100) : 0

  // Top expense categories
  const byCat = {}
  monthTx.filter((t) => t.type === 'expense').forEach((t) => {
    const key = t.category_id || 'uncat'
    byCat[key] = (byCat[key] || 0) + Number(t.amount || 0)
  })
  const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, value]) => {
    const cat = categories.find((c) => c.id === id)
    return { name: cat?.name || 'Uncategorised', value, color: cat?.color || '#64748b' }
  })

  const insights = []
  if (income > 0) {
    if (rate >= 30) insights.push({ tone: 'good', text: `Impressive! You're saving ${rate}% of your income this month — well above the 20% benchmark.` })
    else if (rate >= 20) insights.push({ tone: 'good', text: `Solid month — you're saving ${rate}% of your income.` })
    else if (rate >= 0) insights.push({ tone: 'warn', text: `Only ${rate}% saved so far this month. Try to trim one variable expense category.` })
    else insights.push({ tone: 'warn', text: `You've spent more than you earned this month. Review your top category below.` })
  }
  if (topCats[0]) insights.push({ tone: 'info', text: `Biggest expense category: ${topCats[0].name} at ${money(topCats[0].value)}.` })
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysPassed = now.getDate()
  if (expense > 0) insights.push({ tone: 'info', text: `Daily burn: ${money(Math.round(expense / daysPassed))} · projected month ${money(Math.round((expense / daysPassed) * daysInMonth))}.` })

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-xs uppercase tracking-widest text-accent-200/70 light:text-accent-700">Smart spending</div>
        <h1 className="text-3xl font-semibold tracking-tight text-white light:text-slate-900">Insights · {now.toLocaleString('en-IN', { month: 'long' })}</h1>
      </div>

      <div className="rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] glassy:glass-card p-6">
        <div className="text-xs uppercase tracking-widest text-slate-500">Savings</div>
        <div className={`mt-1 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[1.1] tracking-[-0.01em] ${rate >= 20 ? 'text-emerald-300 light:text-emerald-700' : 'text-amber-300 light:text-amber-700'}`}>{money(savings)}</div>
        <div className={`mt-1 text-sm ${rate >= 20 ? 'text-emerald-300 light:text-emerald-700' : 'text-amber-300 light:text-amber-700'}`}>{rate}% of income</div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <HeroStatTile
            icon={TrendingUp}
            label="Income this month"
            value={money(income)}
            valueTone="text-emerald-300 light:text-emerald-700"
            sub={`${monthTx.filter((t) => t.type === 'income').length} entries`}
          />
          <HeroStatTile
            icon={TrendingDown}
            label="Expenses this month"
            value={money(expense)}
            valueTone="text-rose-300 light:text-rose-700"
            sub={`${monthTx.filter((t) => t.type === 'expense').length} entries`}
          />
        </div>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="min-w-0 rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-5">
          <div className="mb-4 text-sm font-semibold text-white light:text-slate-900">Where money goes</div>
          {topCats.length === 0 ? (
            <EmptyState icon={Tag} title="No expense data" message="Log a few expenses to see your top categories." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={topCats} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} stroke="none">
                    {topCats.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0f1420', border: '1px solid #ffffff22', borderRadius: 12, color: '#fff' }} formatter={(v) => money(v)} />
                  <Legend iconType="circle" wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="min-w-0 rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-5">
          <div className="mb-4 text-sm font-semibold text-white light:text-slate-900">Smart insights</div>
          {insights.length === 0 ? (
            <EmptyState icon={Sparkles} title="Nothing to analyse yet" message="Log a few transactions this month and we'll surface patterns." />
          ) : (
            <div className="space-y-3">
              {insights.map((ins, i) => (
                <div key={i} className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${ins.tone === 'good' ? 'border-emerald-400/25 bg-emerald-500/5 text-emerald-100 light:text-emerald-800' : ins.tone === 'warn' ? 'border-amber-400/25 bg-amber-500/5 text-amber-100 light:text-amber-800' : 'border-accent-400/20 bg-accent-400/5 text-accent-100 light:text-accent-700'}`}>
                  <Sparkles size={16} className="mt-0.5 flex-shrink-0" />
                  <div>{ins.text}</div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 space-y-2">
            <div className="text-xs uppercase tracking-widest text-slate-500">Top categories</div>
            {topCats.length === 0 ? <div className="text-sm text-slate-500">No expense categories yet.</div> : topCats.map((c) => {
              const pct = expense > 0 ? Math.round((c.value / expense) * 100) : 0
              return (
                <div key={c.name}>
                  <div className="flex items-center justify-between text-xs text-slate-400 light:text-slate-500">
                    <span>{c.name}</span><span className="text-white light:text-slate-900">{money(c.value)} · {pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full ring-1 ring-inset ring-white/15 light:ring-black/10" style={{ width: `${pct}%`, background: c.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
