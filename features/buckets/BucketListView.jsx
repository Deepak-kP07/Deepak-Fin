import { Eye, EyeOff, Heart, Mountain, Pencil, PiggyBank, Plus, Rocket, Star, Target, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate, money } from '@/lib/format'

export function BucketListView({ data, onAdd, onEdit, onDelete, showMoney, onToggleMoney }) {
  const { bucket_list, transactions } = data
  // avg monthly savings from last 6 months
  const now = new Date()
  const months = new Set()
  let incomeTotal = 0, expenseTotal = 0
  for (let i = 0; i < 6; i++) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.add(`${d.getFullYear()}-${d.getMonth()}`) }
  transactions.forEach((t) => {
    if (t.type === 'transfer') return
    const d = new Date(t.date); const key = `${d.getFullYear()}-${d.getMonth()}`
    if (!months.has(key)) return
    if (t.type === 'income') incomeTotal += Number(t.amount || 0)
    if (t.type === 'expense') expenseTotal += Number(t.amount || 0)
  })
  const avgMonthlySavings = Math.max(0, (incomeTotal - expenseTotal) / months.size)

  const priorityMeta = {
    dream: { c: 'bg-violet-400/15 text-violet-200 border-violet-400/30', i: Star },
    high: { c: 'bg-rose-400/15 text-rose-200 border-rose-400/30', i: Rocket },
    medium: { c: 'bg-cyan-400/15 text-cyan-200 border-cyan-400/30', i: Target },
    low: { c: 'bg-slate-400/15 text-slate-300 border-slate-400/30', i: Heart },
  }
  const statusMeta = {
    wishlist: 'bg-slate-500/15 text-slate-300',
    saving: 'bg-cyan-400/15 text-cyan-200',
    achieved: 'bg-emerald-400/15 text-emerald-200',
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Dreams with a plan</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Bucket list</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c]"><Plus size={15} />Add</button>
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/5 to-transparent p-5">
        <div className="flex items-center gap-3 text-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-200"><PiggyBank size={18} /></div>
          <div>
            <div className="text-white">Avg monthly savings (last 6 months)</div>
            <div className="text-xs text-slate-500">Used to estimate months-to-goal for each dream</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xl font-semibold text-white">{showMoney ? money(avgMonthlySavings) : '••••'}</div>
            <div className="text-[11px] text-slate-500">per month</div>
          </div>
        </div>
      </div>

      {bucket_list.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <EmptyState icon={Mountain} title="Your list is empty" message="Add the dreams you're building towards — trip, gadget, business, home." cta="Add first dream" onCta={onAdd} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {bucket_list.map((b) => {
            const meta = priorityMeta[b.priority] || priorityMeta.medium
            const cost = Number(b.estimated_cost || 0)
            const months = avgMonthlySavings > 0 ? Math.ceil(cost / avgMonthlySavings) : null
            const years = months ? Math.floor(months / 12) : null
            const monthsRem = months ? months % 12 : null
            const timeLabel = months == null ? 'Log income first to estimate' : years > 0 ? `${years}y ${monthsRem}m at current pace` : `${months} month${months === 1 ? '' : 's'} at current pace`
            return (
              <div key={b.id} className="group rounded-2xl border border-white/10 bg-white/[.035] p-5">
                <div className="flex items-start justify-between">
                  <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest ${meta.c}`}>
                    <meta.i size={11} /> {b.priority}
                  </div>
                  <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => onEdit(b)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={14} /></button>
                    <button onClick={() => onDelete(b)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="mt-4 text-lg font-semibold text-white">{b.title}</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight text-white">{showMoney ? money(cost) : '••••'}</div>
                <div className="mt-3 flex items-center justify-between">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${statusMeta[b.status]}`}>{b.status}</span>
                  {b.target_date && <span className="text-[11px] text-slate-500">by {formatDate(b.target_date)}</span>}
                </div>
                <div className="mt-4 rounded-xl bg-black/20 px-3 py-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2"><Rocket size={13} className="text-cyan-300" />{timeLabel}</div>
                </div>
                {b.notes && <div className="mt-2 text-[11px] text-slate-500">{b.notes}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
