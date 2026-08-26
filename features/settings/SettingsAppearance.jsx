'use client'

import { Moon, Sun } from 'lucide-react'
import { ACCENT_PRESETS, DEFAULT_ACCENT } from '@/lib/color'

export function SettingsAppearance({ theme, onThemeChange, accentColor, onAccentChange }) {
  const current = (accentColor || DEFAULT_ACCENT).toLowerCase()
  const isPreset = ACCENT_PRESETS.some((p) => p.hex.toLowerCase() === current)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025] p-5">
        <div className="text-sm font-semibold text-white light:text-slate-900">Accent color</div>
        <div className="mt-1 text-[11px] text-slate-500">The one signature color used across every screen — buttons, active tabs, highlights.</div>
        <div className="mt-3 flex flex-wrap gap-3">
          {ACCENT_PRESETS.map((p) => (
            <button
              key={p.hex}
              onClick={() => onAccentChange(p.hex)}
              title={p.name}
              className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition ${current === p.hex.toLowerCase() ? 'border-white light:border-slate-900' : 'border-transparent hover:border-white/30 light:hover:border-black/20'}`}
            >
              <span className="h-9 w-9 rounded-full" style={{ backgroundColor: p.hex }} />
            </button>
          ))}
          <label
            title="Custom color"
            className={`relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-2 transition ${!isPreset ? 'border-white light:border-slate-900' : 'border-transparent hover:border-white/30 light:hover:border-black/20'}`}
          >
            <span
              className="h-9 w-9 rounded-full border border-white/20 light:border-black/15"
              style={{ background: isPreset ? 'conic-gradient(from 0deg, #f87171, #fbbf24, #34d399, #38bdf8, #a78bfa, #f87171)' : current }}
            />
            <input
              type="color"
              value={current}
              onChange={(e) => onAccentChange(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025] p-5">
        <div className="text-sm font-semibold text-white light:text-slate-900">Theme</div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[{ v: 'dark', l: 'Dark', Icon: Moon, c: 'from-slate-900 to-slate-700' }, { v: 'light', l: 'Light', Icon: Sun, c: 'from-slate-100 to-white' }].map((t) => (
            <button key={t.v} onClick={() => onThemeChange(t.v)} className={`rounded-xl border p-3 text-left transition ${theme === t.v ? 'border-accent-300/50 light:border-accent-500/50 bg-accent-400/10' : 'border-white/10 light:border-black/10 hover:bg-white/[.04] light:hover:bg-black/[.03]'}`}>
              <div className={`flex h-10 items-center justify-center rounded-lg bg-gradient-to-br ${t.c} border border-white/10 light:border-black/10`}>
                <t.Icon size={16} className={t.v === 'dark' ? 'text-slate-300' : 'text-slate-500'} />
              </div>
              <div className="mt-2 text-sm font-medium text-white light:text-slate-900">{t.l}</div>
              {theme === t.v && <div className="text-[11px] text-accent-300 light:text-accent-600">Active</div>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
