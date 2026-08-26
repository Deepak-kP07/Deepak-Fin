'use client'

import { useEffect, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { MONTH_NAMES, formatDate, todayISO } from '@/lib/format'

// Custom-styled drop-in replacement for a native <input type="date"> — same usage shape
// (value / onChange, value/target.value as an ISO yyyy-mm-dd string).
export function DateInput({ value, onChange, className, placeholder }) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => (value ? new Date(`${value}T00:00:00`) : new Date()))
  const ref = useRef(null)
  useEffect(() => {
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])
  useEffect(() => { if (open) setViewDate(value ? new Date(`${value}T00:00:00`) : new Date()) }, [open])

  const year = viewDate.getFullYear(), month = viewDate.getMonth()
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const pad = (n) => String(n).padStart(2, '0')
  const isoOf = (d) => `${year}-${pad(month + 1)}-${pad(d)}`

  const pick = (d) => { onChange({ target: { value: isoOf(d) } }); setOpen(false) }
  const goToday = () => { onChange({ target: { value: todayISO() } }); setViewDate(new Date()); setOpen(false) }
  const clear = () => { onChange({ target: { value: '' } }); setOpen(false) }
  const base = className || 'w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50'

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className={`${base} flex items-center justify-between gap-2 text-left`}>
        <span className={value ? '' : 'text-slate-500'}>{value ? formatDate(value) : (placeholder || 'Choose date')}</span>
        <Calendar size={15} className="shrink-0 text-slate-500" />
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1 w-72 rounded-2xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-3 shadow-2xl">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))} className="rounded-lg p-1.5 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900"><ChevronLeft size={16} /></button>
            <div className="text-sm font-semibold text-white light:text-slate-900">{MONTH_NAMES[month]} {year}</div>
            <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))} className="rounded-lg p-1.5 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900"><ChevronRight size={16} /></button>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-slate-500">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />
              const iso = isoOf(d)
              const isSelected = iso === value
              const isToday = iso === todayISO()
              return (
                <button key={i} type="button" onClick={() => pick(d)} className={`h-8 rounded-lg text-xs transition ${isSelected ? 'bg-accent-400 font-semibold text-[#07101c]' : isToday ? 'border border-accent-300/40 text-accent-200 light:text-accent-700' : 'text-slate-300 light:text-slate-700 hover:bg-white/10'}`}>{d}</button>
              )
            })}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/10 light:border-black/10 pt-2 text-xs">
            <button type="button" onClick={clear} className="font-medium text-slate-400 light:text-slate-500 hover:text-white hover:light:text-slate-900">Clear</button>
            <button type="button" onClick={goToday} className="font-medium text-accent-300 light:text-accent-700 hover:text-accent-200 hover:light:text-accent-700">Today</button>
          </div>
        </div>
      )}
    </div>
  )
}
