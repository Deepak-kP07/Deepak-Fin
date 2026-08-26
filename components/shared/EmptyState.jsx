export function EmptyState({ icon: Icon, title, message, cta, onCta, compact = false }) {
  if (compact) {
    return (
      <div className="p-5 text-center">
        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-accent-300/10 text-accent-200 light:text-accent-700"><Icon size={16} /></div>
        <div className="mt-2.5 text-sm font-medium text-white light:text-slate-900">{title}</div>
        <p className="mt-1 text-xs text-slate-500">{message}</p>
        {cta && <button onClick={onCta} className="mt-3 rounded-lg bg-accent-300 px-3 py-1.5 text-xs font-semibold text-[#07101c]">{cta}</button>}
      </div>
    )
  }
  return (
    <div className="p-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-300/10 text-accent-200 light:text-accent-700"><Icon size={20} /></div>
      <div className="mt-4 font-medium text-white light:text-slate-900">{title}</div>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
      {cta && <button onClick={onCta} className="mt-5 rounded-xl bg-accent-300 px-4 py-2.5 text-sm font-semibold text-[#07101c]">{cta}</button>}
    </div>
  )
}
