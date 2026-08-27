'use client'

import { useEffect, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Eye, EyeOff, Link2, Plus, ShieldCheck } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { HeroStatTile } from '@/components/shared/HeroStatTile'
import { capitalizeFirst, formatDate, money } from '@/lib/format'
import { scholarshipDisplayStatus } from '@/lib/scholarships'
import { ScholarshipDetailView } from '@/features/scholarships/ScholarshipDetailView'

export function ScholarshipsView({ data, onAdd, onEdit, onDelete, onPay, onRefresh, showMoney, onToggleMoney, toast, onDetailChange }) {
  const { scholarships, scholarship_payments, transactions, accounts } = data
  const [selectedId, setSelectedId] = useState(null)
  const selected = scholarships.find((s) => s.id === selectedId)
  useEffect(() => { onDetailChange?.(selectedId) }, [selectedId])

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
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-accent-200/70 light:text-accent-700">Scholarship trail</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white light:text-slate-900">Scholarships &amp; fees</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={onAdd} className="hidden items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-4 py-2.5 text-sm font-semibold text-[#07101c] lg:flex"><Plus size={15} />Add scholarship</button>
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      {scholarships.length > 0 && (
        <div className="rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] glassy:glass-card p-6">
          <div className="text-xs uppercase tracking-widest text-slate-500">Pending to college</div>
          <div className={`mt-1 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[1.1] tracking-[-0.01em] ${pendingToCollege > 0 ? 'text-amber-300 light:text-amber-700' : 'text-emerald-300 light:text-emerald-700'}`}>{showMoney ? money(pendingToCollege) : '••••••'}</div>
          <div className="mt-1 text-sm text-slate-500">{pendingToCollege > 0 ? 'Due to college' : 'All paid'}</div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <HeroStatTile
              icon={ArrowUpRight}
              label="Received"
              value={showMoney ? money(totalReceived) : '••••'}
              valueTone="text-emerald-300 light:text-emerald-700"
              sub={`${receivedScholarships.length} batch(es)`}
            />
            <HeroStatTile
              icon={ArrowDownRight}
              label="Paid to college"
              value={showMoney ? money(totalPaidCollege) : '••••'}
              valueTone="text-accent-300 light:text-accent-700"
              sub={`${scholarship_payments.length} payment(s)`}
            />
          </div>
        </div>
      )}

      {scholarships.length === 0 ? (
        <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card">
          <EmptyState icon={ShieldCheck} title="No scholarships yet" message="Log received batches and payments to college, and we'll warn if funds are misused." cta="Add first batch" onCta={onAdd} />
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(260px,360px))]">
          {scholarships.map((s) => {
            const paid = Number(s.amount_paid_to_college || 0)
            const total = Number(s.total_amount || 0)
            const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0
            const pending = Math.max(0, total - paid)
            const displayStatus = scholarshipDisplayStatus(s)
            return (
              <div key={s.id} onClick={() => setSelectedId(s.id)} className="cursor-pointer rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-5 transition hover:border-accent-300/30 hover:bg-white/[.05] hover:light:bg-black/[.035]">
                <div className="flex items-center gap-2">
                  <div className="text-base font-semibold text-white light:text-slate-900">{s.name}</div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${displayStatus === 'paid' ? 'bg-emerald-400/15 text-emerald-200 light:text-emerald-700' : displayStatus === 'received' ? 'bg-accent-400/15 text-accent-200 light:text-accent-700' : 'bg-slate-500/15 text-slate-300 light:text-slate-700'}`}>{displayStatus}</span>
                  {s.received_to_account_id && <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-accent-200 light:text-accent-700"><Link2 size={9} />Linked</span>}
                </div>
                <div className="mt-1 text-xs text-slate-500">{capitalizeFirst(s.source) || '—'} · {s.academic_year || '—'}</div>
                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <div className="text-xs text-slate-500">Pending</div>
                    <div className="text-xl font-semibold text-white light:text-slate-900">{showMoney ? money(pending) : '••••'}</div>
                  </div>
                  <div className="text-right text-emerald-300 light:text-emerald-700">
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
