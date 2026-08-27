import { Star } from 'lucide-react'

export function MoneyRulesWidget({ rules, onOpen }) {
  const active = rules.filter((r) => r.is_active).slice(0, 4)
  return (
    <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025] glassy:glass-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-400/15 text-accent-200 light:text-accent-700"><Star size={15} /></div>
          <h2 className="text-sm font-semibold text-white light:text-slate-900">Money rules</h2>
        </div>
        <button onClick={onOpen} className="text-xs text-accent-300 light:text-accent-700 hover:underline">Manage</button>
      </div>
      {active.length === 0 ? (
        <button onClick={onOpen} className="w-full rounded-xl border border-dashed border-white/10 light:border-black/10 py-4 text-sm text-slate-400 light:text-slate-500 hover:bg-white/5">+ Add your first financial rule</button>
      ) : (
        <ul className="space-y-2">
          {active.map((r) => (<li key={r.id} className="flex items-start gap-2 text-sm text-slate-200 light:text-slate-700"><span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-300" />{r.rule_text}</li>))}
        </ul>
      )}
    </div>
  )
}
