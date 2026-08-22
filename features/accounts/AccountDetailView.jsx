'use client'

import { useState } from 'react'
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, ChevronRight, Eye, EyeOff, Landmark, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BankCardFace } from '@/components/shared/BankCardFace'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { NetBar } from '@/components/shared/NetBar'
import { MonthCursor } from '@/components/shared/MonthCursor'
import { formatDateTime, money, monthName } from '@/lib/format'

export function AccountDetailView({ account, debitCard, transactions, categories, onBack, onEdit, onDelete, onEditCard, onDeleteTx, onAddTransaction, showMoney, onToggleMoney }) {
  const activity = transactions
    .filter((t) => t.account_id === account.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date) || String(b.time || '').localeCompare(String(a.time || '')))

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
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: monthName(d), net: 0 })
  }
  activity.forEach((t) => {
    const d = new Date(t.date)
    const bucket = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`)
    if (!bucket) return
    const isIn = t.type === 'income' || (t.type === 'transfer' && t.transfer_direction === 'in')
    bucket.net += isIn ? Number(t.amount || 0) : -Number(t.amount || 0)
  })

  const inflow = activity.reduce((s, t) => { const isIn = t.type === 'income' || (t.type === 'transfer' && t.transfer_direction === 'in'); return isIn ? s + Number(t.amount || 0) : s }, 0)
  const outflow = activity.reduce((s, t) => { const isOut = t.type === 'expense' || (t.type === 'transfer' && t.transfer_direction === 'out'); return isOut ? s + Number(t.amount || 0) : s }, 0)

  return (
    <div className="space-y-5 pb-8">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"><ChevronRight size={14} className="rotate-180" /> Back to accounts</button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        {debitCard ? (
          <div className="w-72 sm:w-80">
            <BankCardFace name={debitCard.name || account.name} subtitle="Debit card" last4={debitCard.account_number_last4 || account.account_number_last4} color={account.color || '#22d3ee'} />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: `${account.color || '#22d3ee'}22`, color: account.color || '#22d3ee' }}>
              {account.type === 'cash' ? <Wallet size={22} /> : <Landmark size={22} />}
            </div>
            <div>
              <div className="text-lg font-semibold text-white">{account.name}</div>
              <div className="text-xs capitalize text-slate-500">{account.type.replace('_', ' ')}{account.bank_name ? ` · ${account.bank_name}` : ''}{account.account_number_last4 ? ` · •${account.account_number_last4}` : ''}</div>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onAddTransaction(account.id)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c]"><Plus size={15} />Add transaction</button>
          <button onClick={() => onEdit(account)} className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5 hover:text-white"><Pencil size={15} /></button>
          <button onClick={() => onDelete(account)} className="rounded-xl border border-white/10 p-2.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={15} /></button>
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      {debitCard && (
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.035] px-5 py-3">
          <div className="text-sm text-white">{account.name}</div>
          <button onClick={() => onEditCard(debitCard)} className="text-xs text-cyan-300 hover:underline">Edit card</button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Current balance" value={showMoney ? money(account.current_balance) : '••••'} icon={Landmark} accent="bg-cyan-300/15 text-cyan-200" sub={<span>Opening {money(account.opening_balance)}</span>} />
        <StatCard label="Money in" value={showMoney ? money(inflow) : '••••'} icon={ArrowUpRight} accent="bg-emerald-400/15 text-emerald-200" tone="text-emerald-300" sub={<span>{activity.length} total transaction{activity.length === 1 ? '' : 's'}</span>} />
        <StatCard label="Money out" value={showMoney ? money(outflow) : '••••'} icon={ArrowDownRight} accent="bg-rose-400/15 text-rose-200" tone="text-rose-300" sub={<span>All time</span>} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
        <div className="text-sm font-semibold text-white">Net cash flow by month · last 6 months</div>
        <div className="mt-4 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={months}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff11" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip cursor={{ fill: '#ffffff08' }} contentStyle={{ background: '#0f1420', border: '1px solid #ffffff22', borderRadius: 12, color: '#fff' }} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} formatter={(v) => money(v)} />
              <Bar dataKey="net" maxBarSize={28} shape={<NetBar />} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.035]">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
          <div className="text-xs uppercase tracking-widest text-slate-500">Account activity · {monthActivity.length}</div>
          <MonthCursor cursor={monthCursor} onShift={shiftMonth} showAll={showAllMonths} onToggleAll={() => setShowAllMonths((v) => !v)} />
        </div>
        {monthActivity.length === 0 ? (
          <EmptyState compact icon={ArrowDownRight} title={showAllMonths ? 'No activity yet' : 'No activity this month'} message="Transactions on this account will show up here." />
        ) : (
          <>
            <div className="hidden grid-cols-[1.4fr_.9fr_.6fr_.6fr_auto] gap-4 border-b border-white/10 px-5 py-2.5 text-[10px] uppercase tracking-widest text-slate-600 sm:grid">
              <span>Description</span>
              <span>Category</span>
              <span>Date</span>
              <span className="text-right">Amount</span>
              <span />
            </div>
            <div className="max-h-96 divide-y divide-white/5 overflow-y-auto">
              {monthActivity.map((t) => {
                const cat = categories.find((c) => c.id === t.category_id)
                const isIn = t.type === 'income' || (t.type === 'transfer' && t.transfer_direction === 'in')
                const isTransfer = t.type === 'transfer'
                const color = isIn ? 'text-emerald-300' : isTransfer ? 'text-cyan-300' : 'text-rose-300'
                return (
                  <div key={t.id} className="grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-[1.4fr_.9fr_.6fr_.6fr_auto] sm:items-center sm:gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.05]" style={{ color: cat?.color || (isTransfer ? '#22d3ee' : '#94a3b8') }}>
                        {isTransfer ? <ArrowLeftRight size={16} /> : isIn ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">{t.description}</div>
                        {t.notes && <div className="truncate text-[11px] text-slate-500">{t.notes}</div>}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      <span className="inline-block rounded-md bg-white/[.05] px-2 py-0.5" style={{ color: cat?.color || '#94a3b8' }}>{cat?.name || (isTransfer ? (t.transfer_direction === 'in' ? 'Transfer in' : 'Transfer out') : 'Uncategorised')}</span>
                    </div>
                    <div className="text-xs text-slate-500">{formatDateTime(t.date, t.time)}</div>
                    <div className={`text-sm font-semibold sm:text-right ${color}`}>{isIn ? '+' : '-'}{showMoney ? money(t.amount) : '••••'}</div>
                    <div className="flex justify-end">
                      <button onClick={() => onDeleteTx(t)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={13} /></button>
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
