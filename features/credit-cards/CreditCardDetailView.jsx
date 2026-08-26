'use client'

import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight, ChevronRight, Eye, EyeOff, Pencil, Target, Trash2 } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BankCardFace } from '@/components/shared/BankCardFace'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { MonthCursor } from '@/components/shared/MonthCursor'
import { nextBillDue, utilisationSeverity } from '@/lib/creditCards'
import { formatDate, formatDateTime, money, monthName, ordinal } from '@/lib/format'

// Bill payments are logged through /finance/credit_cards/:id/pay_bill, which creates a plain
// transaction with a fixed, app-generated description rather than a linked_module reference —
// matching on that description is how "repayment history" finds them among all transactions.
const billPaymentDescription = (card) => `Credit card bill · ${card.name}`

// A card's outstanding balance is affected by charges from two different places: the dedicated
// "Log spend" flow (credit_card_transactions) AND anything paid using this card as a funding
// source elsewhere in the app — a loan EMI, a lend, or a regular expense with this card picked
// as the account (all land in the main transactions table, linked via linked_module). Showing
// only the first source undercounts real activity, which is exactly what looked "not matching"
// against the outstanding balance.
function buildActivity(card, cardTransactions, allTransactions) {
  const fromLog = cardTransactions.map((t) => ({
    id: t.id, date: t.date, time: t.time, description: t.description, amount: Number(t.amount || 0),
    categoryId: t.category_id, direction: 'debit', status: t.status, source: 'log', row: t,
  }))
  const fromLinked = allTransactions
    .filter((t) => t.linked_module === 'credit_card' && t.linked_module_id === card.id)
    .map((t) => ({
      id: t.id, date: t.date, time: t.time, description: t.description, amount: Number(t.amount || 0),
      categoryId: t.category_id, direction: t.type === 'income' ? 'credit' : 'debit', status: null, source: 'linked', row: t,
    }))
  return [...fromLog, ...fromLinked].sort((a, b) => new Date(b.date) - new Date(a.date) || String(b.time || '').localeCompare(String(a.time || '')))
}

export function CreditCardDetailView({ card, cardTransactions, allTransactions, categories, onBack, onSpend, onPay, onDeleteSpend, onDeleteTx, onEdit, onDelete, showMoney, onToggleMoney }) {
  const util = Number(card.credit_limit) > 0 ? Math.min(100, Math.round((Number(card.current_outstanding) / Number(card.credit_limit)) * 100)) : 0
  const activity = buildActivity(card, cardTransactions, allTransactions)
  const nd = nextBillDue(card)

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
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: monthName(d), spend: 0, count: 0 })
  }
  activity.forEach((a) => {
    const d = new Date(a.date)
    const bucket = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`)
    if (bucket) { bucket.spend += a.direction === 'debit' ? a.amount : -a.amount; bucket.count++ }
  })

  const repayments = allTransactions
    .filter((t) => t.type === 'expense' && t.description === billPaymentDescription(card))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  const totalRepaid = repayments.reduce((s, t) => s + Number(t.amount || 0), 0)

  const deleteActivity = (a) => (a.source === 'log' ? onDeleteSpend(a.row) : onDeleteTx(a.row))

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 light:text-slate-500 hover:text-white hover:light:text-slate-900"><ChevronRight size={14} className="rotate-180" /> Back to credit cards</button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="w-72 sm:w-80">
          <BankCardFace name={card.name} subtitle={card.bank || 'Credit card'} last4={card.last4} color={card.color || '#a78bfa'} />
        </div>
        <div className="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto">
          <button onClick={() => onSpend(card)} className="rounded-xl bg-white/[.06] light:bg-black/[.04] px-4 py-2.5 text-sm font-semibold text-white light:text-slate-900 hover:bg-white/[.1] hover:light:bg-black/[.06]">+ Log spend</button>
          <button onClick={() => onPay(card)} disabled={Number(card.current_outstanding) <= 0} className="rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-4 py-2.5 text-sm font-semibold text-[#07101c] disabled:opacity-50">Pay bill</button>
          <button onClick={() => onEdit(card)} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900"><Pencil size={15} /></button>
          <button onClick={() => onDelete(card)} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={15} /></button>
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      <div className={`rounded-xl border px-4 py-3 text-sm ${nd.days <= 4 ? 'border-amber-300/30 bg-amber-300/5 text-amber-200 light:text-amber-700' : 'border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025] text-slate-300 light:text-slate-700'}`}>
        Bill on the {ordinal(card.billing_date)} · Due {nd.days > 0 ? `in ${nd.days} day${nd.days === 1 ? '' : 's'}` : nd.days === 0 ? 'today' : 'overdue'} ({formatDate(nd.due.toISOString().slice(0, 10))})
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Outstanding" value={showMoney ? money(card.current_outstanding) : '••••'} icon={ArrowDownRight} accent="bg-rose-400/15 text-rose-200 light:text-rose-700" tone="text-rose-300 light:text-rose-700" sub={<span>of {money(card.credit_limit)} limit</span>} />
        <StatCard label="Utilisation" value={`${util}%`} icon={Target} accent="bg-accent-400/15 text-accent-200 light:text-accent-700" tone={utilisationSeverity(util).tone} sub={<span>{utilisationSeverity(util).label}</span>} />
        <StatCard label="Total repaid" value={showMoney ? money(totalRepaid) : '••••'} icon={ArrowUpRight} accent="bg-emerald-400/15 text-emerald-200 light:text-emerald-700" sub={<span>{repayments.length} payment{repayments.length === 1 ? '' : 's'}</span>} />
      </div>

      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025] p-5">
        <div className="text-sm font-semibold text-white light:text-slate-900">Net spend by month · last 6 months</div>
        <div className="mt-4 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={months}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff11" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip cursor={{ fill: '#ffffff08' }} contentStyle={{ background: '#0f1420', border: '1px solid #ffffff22', borderRadius: 12, color: '#fff' }} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} formatter={(v) => money(v)} />
              {/* A fixed, always-readable palette instead of the card's own accent colour —
                  that colour is user-picked and can be dark enough to nearly vanish against
                  this chart's dark background. Rose for a net-spend month, emerald for a rare
                  net-credit one (refunds outweighing charges), matching the expense/income
                  colours used in every other chart in the app. */}
              <Bar dataKey="spend" radius={[6, 6, 0, 0]} maxBarSize={28}>
                {months.map((m, i) => (
                  <Cell key={i} fill={m.spend < 0 ? '#34d399' : '#fb7185'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025]">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 light:border-black/10 px-5 py-3">
          <div className="text-xs uppercase tracking-widest text-slate-500">Card activity · {monthActivity.length}</div>
          <MonthCursor cursor={monthCursor} onShift={shiftMonth} showAll={showAllMonths} onToggleAll={() => setShowAllMonths((v) => !v)} />
        </div>
        {monthActivity.length === 0 ? (
          <EmptyState compact icon={ArrowDownRight} title={showAllMonths ? 'No activity yet' : 'No activity this month'} message="Log a spend, or pay for something with this card, to see it here." cta="Log spend" onCta={() => onSpend(card)} />
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
            {monthActivity.map((a) => {
              const cat = categories.find((c) => c.id === a.categoryId)
              const isDebit = a.direction === 'debit'
              return (
                <div key={`${a.source}-${a.id}`} className="grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-[1.4fr_.9fr_.6fr_.6fr_auto] sm:items-center sm:gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.05] light:bg-black/[.035]" style={{ color: cat?.color || '#94a3b8' }}>
                      {isDebit ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-white light:text-slate-900">{a.description}</div>
                      {a.status && <div className="text-[11px] uppercase tracking-widest text-slate-500">{a.status}</div>}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 light:text-slate-500">
                    <span className="inline-block rounded-md bg-white/[.05] light:bg-black/[.035] px-2 py-0.5" style={{ color: cat?.color || '#94a3b8' }}>{cat?.name || 'Uncategorised'}</span>
                  </div>
                  <div className="text-xs text-slate-500">{formatDateTime(a.date, a.time)}</div>
                  <div className={`text-sm font-semibold sm:text-right ${isDebit ? 'text-rose-300 light:text-rose-700' : 'text-emerald-300 light:text-emerald-700'}`}>{isDebit ? '-' : '+'}{showMoney ? money(a.amount) : '••••'}</div>
                  <div className="flex justify-end">
                    <button onClick={() => deleteActivity(a)} className="rounded-lg p-1.5 text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={13} /></button>
                  </div>
                </div>
              )
            })}
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025]">
        <div className="border-b border-white/10 light:border-black/10 px-5 py-3 text-xs uppercase tracking-widest text-slate-500">Repayment history · {repayments.length}</div>
        {repayments.length === 0 ? (
          <div className="px-5 py-6 text-sm text-slate-500">No payments logged yet.</div>
        ) : (
          <div className="max-h-64 divide-y divide-white/5 light:divide-black/5 overflow-y-auto">
            {repayments.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div className="text-slate-300 light:text-slate-700">{formatDate(r.date)}</div>
                <div className="font-medium text-emerald-300 light:text-emerald-700">{showMoney ? `+${money(r.amount)}` : '••••'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
