import { ArrowDownRight, ArrowUpRight, Eye, EyeOff, Pencil, Plus, ShieldCheck, Sparkles, Target, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { formatDate, money } from '@/lib/format'

export function ScholarshipsView({ data, onAdd, onEdit, onDelete, onPay, showMoney, onToggleMoney }) {
  const { scholarships, scholarship_payments, transactions, categories, accounts } = data
  const totalReceived = scholarships.filter((s) => s.status !== 'pending').reduce((s, x) => s + Number(x.total_amount || 0), 0)
  const totalPaidCollege = scholarships.reduce((s, x) => s + Number(x.amount_paid_to_college || 0), 0)
  const pendingToCollege = totalReceived - totalPaidCollege

  // Misuse detection: for each scholarship, look at transactions from its received_to_account after received_date,
  // any non-scholarship expense counted as potentially misused
  const misuseWarn = (s) => {
    if (!s.received_to_account_id || !s.received_date) return null
    const misused = transactions.filter((t) => t.account_id === s.received_to_account_id && t.type === 'expense' && new Date(t.date) >= new Date(s.received_date) && t.linked_module !== 'scholarship' && t.linked_module !== 'investment')
    const amount = misused.reduce((a, t) => a + Number(t.amount || 0), 0)
    return amount > 0 ? { amount, count: misused.length } : null
  }

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
        <StatCard label="Received" value={showMoney ? money(totalReceived) : '••••'} icon={ArrowUpRight} accent="bg-emerald-400/15 text-emerald-200" sub={<span>{scholarships.filter((s) => s.status !== 'pending').length} batch(es)</span>} />
        <StatCard label="Paid to college" value={showMoney ? money(totalPaidCollege) : '••••'} icon={ArrowDownRight} accent="bg-cyan-400/15 text-cyan-200" sub={<span>{scholarship_payments.length} payment(s)</span>} />
        <StatCard label="Pending to college" value={showMoney ? money(pendingToCollege) : '••••'} icon={Target} accent="bg-amber-400/15 text-amber-200" tone={pendingToCollege > 0 ? 'text-amber-300' : 'text-emerald-300'} sub={<span className={pendingToCollege > 0 ? 'text-amber-300' : 'text-emerald-300'}>{pendingToCollege > 0 ? 'Due to college' : 'All paid'}</span>} />
      </div>

      {scholarships.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <EmptyState icon={ShieldCheck} title="No scholarships yet" message="Log received batches and payments to college, and we'll warn if funds are misused." cta="Add first batch" onCta={onAdd} />
        </div>
      ) : (
        <div className="space-y-4">
          {scholarships.map((s) => {
            const paid = Number(s.amount_paid_to_college || 0)
            const total = Number(s.total_amount || 0)
            const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0
            const pending = Math.max(0, total - paid)
            const acc = accounts.find((a) => a.id === s.received_to_account_id)
            const warn = misuseWarn(s)
            return (
              <div key={s.id} className="group rounded-2xl border border-white/10 bg-white/[.035] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-base font-semibold text-white">{s.name}</div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${s.status === 'paid' ? 'bg-emerald-400/15 text-emerald-200' : s.status === 'received' ? 'bg-cyan-400/15 text-cyan-200' : 'bg-slate-500/15 text-slate-300'}`}>{s.status}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{s.source || '—'} · {s.academic_year || '—'}{acc ? ` · into ${acc.name}` : ''}{s.received_date ? ` · received ${formatDate(s.received_date)}` : ''}{s.due_date ? ` · due ${formatDate(s.due_date)}` : ''}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onPay(s)} disabled={pending <= 0} className="rounded-lg bg-gradient-to-r from-cyan-300 to-blue-500 px-3 py-1.5 text-xs font-semibold text-[#07101c] disabled:opacity-50">Pay to college</button>
                    <button onClick={() => onEdit(s)} className="rounded-lg border border-white/10 p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={13} /></button>
                    <button onClick={() => onDelete(s)} className="rounded-lg border border-white/10 p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div><div className="text-xs text-slate-500">Total</div><div className="mt-1 text-lg font-semibold text-white">{money(total)}</div></div>
                  <div><div className="text-xs text-slate-500">Paid to college</div><div className="mt-1 text-lg font-semibold text-emerald-300">{money(paid)}</div></div>
                  <div><div className="text-xs text-slate-500">Pending</div><div className="mt-1 text-lg font-semibold text-amber-300">{money(pending)}</div></div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} /></div>
                {warn && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/5 px-4 py-2.5 text-xs text-amber-200">
                    <Sparkles size={13} /> Warning: {money(warn.amount)} across {warn.count} non-scholarship expenses from the receiving account since money arrived. Consider paying college first.
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
