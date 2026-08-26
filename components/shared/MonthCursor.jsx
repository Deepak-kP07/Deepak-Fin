'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MONTH_NAMES } from '@/lib/format'

// Shared month-stepper + "All" toggle for an activity list (Accounts, Credit cards, Investments'
// cash activity, Family/Company entries all had/have their own copy of this exact chevron widget
// — this is the single implementation they all use.
// `cursor` stays a real {year, month} even while showAll is on, so toggling back to month view
// lands on whichever month you were last looking at instead of resetting to today.
// The chevrons stay clickable even while showAll is on — `onShift` is expected to both move the
// cursor AND turn showAll back off, so stepping a month while "All" is selected switches you
// straight back to month view instead of silently doing nothing until "All" is clicked again.
export function MonthCursor({ cursor, onShift, showAll, onToggleAll }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`flex items-center rounded-xl border border-white/10 light:border-black/10 transition-opacity ${showAll ? 'opacity-50' : ''}`}>
        <button type="button" onClick={() => onShift(-1)} className="rounded-l-xl p-2 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900" title="Previous month"><ChevronLeft size={14} /></button>
        <span className="w-9 text-center text-xs font-semibold uppercase tracking-wider text-slate-300 light:text-slate-700" title={`${MONTH_NAMES[cursor.month]} ${cursor.year}`}>{MONTH_NAMES[cursor.month].slice(0, 3)}</span>
        <button type="button" onClick={() => onShift(1)} className="rounded-r-xl p-2 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900" title="Next month"><ChevronRight size={14} /></button>
      </div>
      <button
        type="button" onClick={onToggleAll}
        className={`rounded-xl border px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition ${showAll ? 'border-accent-300/40 bg-accent-400/15 text-accent-200 light:text-accent-700' : 'border-white/10 light:border-black/10 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900'}`}
      >All</button>
    </div>
  )
}
