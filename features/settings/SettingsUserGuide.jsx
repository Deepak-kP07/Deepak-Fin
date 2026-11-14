'use client'

import { useState } from 'react'
import {
  BarChart3, Bell, Briefcase, ChevronDown, CreditCard, Heart, KeyRound, Landmark,
  LayoutDashboard, Link2, LineChart, Mountain, Palette, Play, Repeat, ShieldAlert, ShieldCheck,
  Smartphone, Star, Tag, Target, Trash2, TrendingUp, Users,
} from 'lucide-react'

import { GUIDE as GUIDE_DATA } from '@/lib/userGuide'

const ICONS = { BarChart3, Briefcase, CreditCard, Heart, KeyRound, Landmark, LayoutDashboard, LineChart, Link2, Mountain, Palette, Repeat, ShieldCheck, Smartphone, Star, Tag, Target, TrendingUp, Users }
const GUIDE = GUIDE_DATA.map((g) => ({ ...g, icon: ICONS[g.icon] }))

function GuideItem({ item, isOpen, onToggle }) {
  const Icon = item.icon
  return (
    <div className="overflow-hidden rounded-xl bg-black/20 light:bg-black/[.06]">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <Icon size={16} className="shrink-0 text-accent-300 light:text-accent-700" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-white light:text-slate-900">{item.label}</div>
          {!isOpen && <div className="truncate text-xs text-slate-500">{item.blurb}</div>}
        </div>
        <ChevronDown size={15} className={`shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pl-[2.6rem]">
          <div className="text-xs text-slate-400 light:text-slate-600">{item.blurb}</div>
          <ul className="mt-2 space-y-1.5">
            {item.points.map((p, i) => (
              <li key={i} className="flex gap-2 text-xs leading-5 text-slate-400 light:text-slate-600">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-500" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function SettingsUserGuide({ onReplayTour, onClearAllData }) {
  const [openKey, setOpenKey] = useState(null)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-white light:text-slate-900">User guide</div>
          {onReplayTour && (
            <button
              onClick={onReplayTour}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 light:border-black/10 px-3 py-1.5 text-xs text-slate-400 light:text-slate-500 hover:bg-white/5"
            >
              <Play size={13} />Replay tour
            </button>
          )}
        </div>
        <div className="mt-1 text-[11px] text-slate-500">What each part of the app does, and how to use it. Tap a section to expand it.</div>
        <div className="mt-3 space-y-2">
          {GUIDE.map((item) => (
            <GuideItem
              key={item.label}
              item={item}
              isOpen={openKey === item.label}
              onToggle={() => setOpenKey(openKey === item.label ? null : item.label)}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white light:text-slate-900">
          <ShieldAlert size={16} className="text-accent-300 light:text-accent-700" />
          Keeping your data safe
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-400 light:text-slate-600">
          We've taken care to keep your data safe — encrypted storage, access limited to what you explicitly
          share, and role-based permissions on anything shared with someone else. Even so, you're responsible
          for your own data: keep your login private, only grant access to people you trust, and use CSV
          exports where available if you want your own backup.
        </p>
        {onClearAllData && (
          <div className="mt-4 border-t border-white/10 light:border-black/10 pt-4">
            <button
              onClick={onClearAllData}
              className="flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3.5 py-2.5 text-xs font-medium text-rose-300 light:text-rose-700 hover:bg-rose-400/15"
            >
              <Trash2 size={14} />Clear all data
            </button>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              Permanently deletes every account, transaction, and record you have across the app. This can't be undone.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
