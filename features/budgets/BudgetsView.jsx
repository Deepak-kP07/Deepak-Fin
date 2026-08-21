import { Eye, EyeOff, Pencil, Plus, Target, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { money } from '@/lib/format'

export function BudgetsView({ data, onAdd, onEdit, onDelete, showMoney, onToggleMoney }) {
  const { budgets, categories, transactions } = data
  const now = new Date()
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`
  const yearKey = `${now.getFullYear()}`
  const spendByCat = (categoryId, period) => transactions.filter((t) => {
    if (t.type !== 'expense' || t.category_id !== categoryId) return false
    const d = new Date(t.date)
    if (period === 'monthly') return `${d.getFullYear()}-${d.getMonth()}` === monthKey
    return `${d.getFullYear()}` === yearKey
  }).reduce((s, t) => s + Number(t.amount || 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Guardrails</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Budgets</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c]"><Plus size={15} />Add budget</button>
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>
      {budgets.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <EmptyState icon={Target} title="No budgets yet" message="Set a monthly limit per category to keep spending in check." cta="Add budget" onCta={onAdd} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {budgets.map((b) => {
            const cat = categories.find((c) => c.id === b.category_id)
            const spent = spendByCat(b.category_id, b.period)
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
                      <div className="text-[11px] capitalize text-slate-500">{b.period}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => onEdit(b)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={14} /></button>
                    <button onClick={() => onDelete(b)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="mt-5 flex items-baseline justify-between">
                  <div className="text-2xl font-semibold tracking-tight text-white">{showMoney ? money(spent) : '••••'}</div>
                  <div className="text-xs text-slate-500">of {showMoney ? money(limit) : '••••'}</div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                  <div className={`h-full rounded-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <div className={`mt-2 text-xs ${text}`}>{showMoney ? (pct >= 100 ? `Over budget by ${money(spent - limit)}` : `${pct}% used · ${money(limit - spent)} left`) : `${pct}% used`}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
