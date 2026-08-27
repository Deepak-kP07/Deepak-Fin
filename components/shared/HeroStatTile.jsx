// The quiet secondary-stat tile that sits inside a module's hero card (Invested/P&L, Total
// limit/Utilisation, Bank/Cash, ...) — distinct from `StatCard` (bordered, icon badge, its own
// top-level grid). This one has no border and a smaller value, and was duplicated byte-for-byte
// across 11+ files before this extraction. `valueTone` colors only the headline value, matching
// the convention already used everywhere except one outlier (Investments' P&L tile used to tint
// its label and sub-line too) — label and sub stay neutral slate, same as every other instance.
export function HeroStatTile({ icon: Icon, label, value, valueTone = 'text-white light:text-slate-900', sub }) {
  return (
    <div className="rounded-2xl bg-white/[.04] light:bg-black/[.03] p-3.5 glassy:glass-pill">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 light:text-slate-500">
        {Icon && <Icon size={13} />}{label}
      </div>
      <div className={`mt-1 text-lg font-semibold ${valueTone}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </div>
  )
}
