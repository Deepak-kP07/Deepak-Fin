import { ArrowDownRight, ArrowUpRight, Briefcase, Eye, EyeOff, Pencil, Plus, Target, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { formatDateTime, money } from '@/lib/format'

export function ZopkitView({ data, onAdd, onEdit, onDelete, showMoney, onToggleMoney }) {
  const { zopkit_transactions } = data
  const now = new Date()
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`
  const monthTx = zopkit_transactions.filter((t) => { const d = new Date(t.date); return `${d.getFullYear()}-${d.getMonth()}` === monthKey })
  const monthIn = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0)
  const monthOut = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0)
  const totalIn = zopkit_transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0)
  const totalOut = zopkit_transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0)
  const balance = totalIn - totalOut

  const byCategory = {}
  monthTx.filter((t) => t.type === 'expense').forEach((t) => { const k = t.category || 'other'; byCategory[k] = (byCategory[k] || 0) + Number(t.amount || 0) })

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Startup ledger</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Zopkit finance</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c]"><Plus size={15} />Log</button>
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label={`In · ${now.toLocaleString('en-IN', { month: 'short' })}`} value={showMoney ? money(monthIn) : '••••'} icon={ArrowUpRight} accent="bg-emerald-400/15 text-emerald-200" sub={<span>{monthTx.filter(t => t.type === 'income').length} entries</span>} />
        <StatCard label={`Out · ${now.toLocaleString('en-IN', { month: 'short' })}`} value={showMoney ? money(monthOut) : '••••'} icon={ArrowDownRight} accent="bg-rose-400/15 text-rose-200" tone="text-rose-300" sub={<span className="text-rose-300">{monthTx.filter(t => t.type === 'expense').length} entries</span>} />
        <StatCard label="Net this month" value={showMoney ? money(monthIn - monthOut) : '••••'} icon={Target} accent="bg-cyan-400/15 text-cyan-200" sub={<span className={monthIn - monthOut >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{monthIn - monthOut >= 0 ? 'Positive' : 'Negative'}</span>} tone={monthIn - monthOut >= 0 ? 'text-emerald-300' : 'text-rose-300'} />
        <StatCard label="Zopkit balance" value={showMoney ? money(balance) : '••••'} icon={Briefcase} accent="bg-violet-400/15 text-violet-200" sub={<span>All-time</span>} />
      </div>

      {Object.keys(byCategory).length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
          <div className="mb-3 text-sm font-semibold text-white">This month by category</div>
          <div className="space-y-2">
            {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
              const pct = monthOut > 0 ? Math.round((amt / monthOut) * 100) : 0
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="capitalize">{cat}</span><span className="text-white">{money(amt)} · {pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${pct}%` }} /></div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.035]">
        {zopkit_transactions.length === 0 ? (
          <EmptyState icon={Briefcase} title="No Zopkit entries yet" message="Log the money flowing through your startup — CEO transfers, tools, team ops." cta="Add first entry" onCta={onAdd} />
        ) : (
          <div className="divide-y divide-white/5">
            {zopkit_transactions.map((t) => (
              <div key={t.id} className="group grid grid-cols-[1.4fr_.9fr_.6fr_auto] items-center gap-4 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${t.type === 'income' ? 'bg-emerald-400/15 text-emerald-200' : 'bg-rose-400/15 text-rose-200'}`}>
                    {t.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{t.description}</div>
                    <div className="text-[11px] text-slate-500">{t.category || 'other'} · by {t.added_by}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">{formatDateTime(t.date, t.time)}</div>
                <div className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-300' : 'text-rose-300'}`}>{showMoney ? (t.type === 'income' ? '+' : '-') + money(t.amount).replace('-', '') : '••••'}</div>
                <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button onClick={() => onEdit(t)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={13} /></button>
                  <button onClick={() => onDelete(t)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
