import { Star } from 'lucide-react'

export function MoneyRulesWidget({ rules, onOpen }) {
  const active = rules.filter((r) => r.is_active).slice(0, 4)
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/5 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-400/15 text-violet-200"><Star size={15} /></div>
          <div className="text-sm font-semibold text-white">Money rules</div>
        </div>
        <button onClick={onOpen} className="text-xs text-cyan-300 hover:underline">Manage</button>
      </div>
      {active.length === 0 ? (
        <button onClick={onOpen} className="w-full rounded-xl border border-dashed border-white/10 py-4 text-sm text-slate-400 hover:bg-white/5">+ Add your first financial rule</button>
      ) : (
        <ul className="space-y-2">
          {active.map((r) => (<li key={r.id} className="flex items-start gap-2 text-sm text-slate-200"><span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-300" />{r.rule_text}</li>))}
        </ul>
      )}
    </div>
  )
}
