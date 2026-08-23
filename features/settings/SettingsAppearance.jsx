'use client'

export function SettingsAppearance({ theme, onThemeChange }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <div className="text-sm font-semibold text-white">Theme</div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {[{ v: 'dark', l: 'Dark', c: 'from-slate-900 to-slate-700' }, { v: 'midnight', l: 'Midnight', c: 'from-[#0b1220] to-[#1e2a44]' }, { v: 'ocean', l: 'Ocean', c: 'from-cyan-900 to-blue-950' }].map((t) => (
          <button key={t.v} onClick={() => onThemeChange(t.v)} className={`rounded-xl border p-3 text-left transition ${theme === t.v ? 'border-cyan-300/50 bg-cyan-400/10' : 'border-white/10 hover:bg-white/[.04]'}`}>
            <div className={`h-10 rounded-lg bg-gradient-to-br ${t.c}`} />
            <div className="mt-2 text-sm font-medium text-white">{t.l}</div>
            {theme === t.v && <div className="text-[11px] text-cyan-300">Active</div>}
          </button>
        ))}
      </div>
      <div className="mt-2 text-[11px] text-slate-500">Currently only dark themes; light mode coming soon.</div>
    </div>
  )
}
