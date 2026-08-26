// `onClick` is optional — omit it for a plain informational card (the original, still-default
// behavior every existing caller relies on), or pass it to render the exact same card as a real
// button (e.g. a quick-tile that navigates to its own module). Keeping both behind one component
// is what guarantees a stat card and a clickable tile are always pixel-identical in size.
export function StatCard({ label, value, sub, icon: Icon, accent = 'bg-accent-300/10 text-accent-200 light:text-accent-700', tone = 'text-emerald-300 light:text-emerald-700', onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      className={`min-w-0 rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025] p-3.5${onClick ? ' w-full text-left transition hover:bg-white/[.06] hover:light:bg-black/[.04]' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs text-slate-400 light:text-slate-500">{label}</span>
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${accent}`}><Icon size={14} /></div>
      </div>
      <div className="mt-2.5 truncate text-xl font-semibold tracking-tight text-white light:text-slate-900">{value}</div>
      {sub && <div className={`mt-1 flex items-center gap-1 truncate text-[11px] ${tone}`}>{sub}</div>}
    </Tag>
  )
}
