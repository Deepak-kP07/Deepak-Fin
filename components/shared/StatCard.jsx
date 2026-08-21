export function StatCard({ label, value, sub, icon: Icon, accent = 'bg-cyan-300/10 text-cyan-200', tone = 'text-emerald-300' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{label}</span>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${accent}`}><Icon size={14} /></div>
      </div>
      <div className="mt-2.5 text-xl font-semibold tracking-tight text-white">{value}</div>
      {sub && <div className={`mt-1 flex items-center gap-1 text-[11px] ${tone}`}>{sub}</div>}
    </div>
  )
}
