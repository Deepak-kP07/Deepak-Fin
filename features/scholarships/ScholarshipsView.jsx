'use client'

import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Eye, EyeOff, Link2, Plus, ShieldCheck, Target } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { formatDate, money } from '@/lib/format'
import { scholarshipDisplayStatus } from '@/lib/scholarships'
import { ScholarshipDetailView } from '@/features/scholarships/ScholarshipDetailView'

export function ScholarshipsView({ data, onAdd, onEdit, onDelete, onPay, onRefresh, showMoney, onToggleMoney, toast }) {
  const { scholarships, scholarship_payments, transactions, accounts } = data
  const [selectedId, setSelectedId] = useState(null)
  const selected = scholarships.find((s) => s.id === selectedId)

  if (selected) {
    return (
      <ScholarshipDetailView
        scholarship={selected}
        payments={scholarship_payments}
        accounts={accounts}
        transactions={transactions}
        onBack={() => setSelectedId(null)}
        onEdit={onEdit}
        onDelete={(s) => { onDelete(s); setSelectedId(null) }}
        onPay={onPay}
        onRefresh={onRefresh}
        showMoney={showMoney}
        onToggleMoney={onToggleMoney}
        toast={toast}
      />
    )
  }

  const receivedScholarships = scholarships.filter((s) => scholarshipDisplayStatus(s) !== 'pending')
  const totalReceived = receivedScholarships.reduce((s, x) => s + Number(x.total_amount || 0), 0)
  const totalPaidCollege = scholarships.reduce((s, x) => s + Number(x.amount_paid_to_college || 0), 0)
  const pendingToCollege = Math.max(0, totalReceived - totalPaidCollege)

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Scholarship trail</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Scholarships &amp; fees</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c]"><Plus size={15} />Add scholarship</button>
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Received" value={showMoney ? money(totalReceived) : '••••'} icon={ArrowUpRight} accent="bg-emerald-400/15 text-emerald-200" sub={<span>{receivedScholarships.length} batch(es)</span>} />
        <StatCard label="Paid to college" value={showMoney ? money(totalPaidCollege) : '••••'} icon={ArrowDownRight} accent="bg-cyan-400/15 text-cyan-200" sub={<span>{scholarship_payments.length} payment(s)</span>} />
        <StatCard label="Pending to college" value={showMoney ? money(pendingToCollege) : '••••'} icon={Target} accent="bg-amber-400/15 text-amber-200" tone={pendingToCollege > 0 ? 'text-amber-300' : 'text-emerald-300'} sub={<span className={pendingToCollege > 0 ? 'text-amber-300' : 'text-emerald-300'}>{pendingToCollege > 0 ? 'Due to college' : 'All paid'}</span>} />
      </div>

      {scholarships.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <EmptyState icon={ShieldCheck} title="No scholarships yet" message="Log received batches and payments to college, and we'll warn if funds are misused." cta="Add first batch" onCta={onAdd} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {scholarships.map((s) => {
            const paid = Number(s.amount_paid_to_college || 0)
            const total = Number(s.total_amount || 0)
            const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0
            const pending = Math.max(0, total - paid)
            const displayStatus = scholarshipDisplayStatus(s)
            return (
              <div key={s.id} onClick={() => setSelectedId(s.id)} className="cursor-pointer rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:border-cyan-300/30 hover:bg-white/[.05]">
                <div className="flex items-center gap-2">
                  <div className="text-base font-semibold text-white">{s.name}</div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${displayStatus === 'paid' ? 'bg-emerald-400/15 text-emerald-200' : displayStatus === 'received' ? 'bg-cyan-400/15 text-cyan-200' : 'bg-slate-500/15 text-slate-300'}`}>{displayStatus}</span>
                  {s.received_to_account_id && <span className="flex shrink-0 items-center gap-1 rounded-full bg-cyan-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-cyan-200"><Link2 size={9} />Linked</span>}
                </div>
                <div className="mt-1 text-xs text-slate-500">{s.source || '—'} · {s.academic_year || '—'}</div>
                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <div className="text-xs text-slate-500">Pending</div>
                    <div className="text-xl font-semibold text-white">{showMoney ? money(pending) : '••••'}</div>
                  </div>
                  <div className="text-right text-emerald-300">
                    <div className="text-xs opacity-70">Paid</div>
                    <div className="text-sm font-semibold">{money(paid)}</div>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} /></div>
                <div className="mt-2 text-[11px] text-slate-500">of {money(total)} total{s.received_date ? ` · received ${formatDate(s.received_date)}` : ''}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
