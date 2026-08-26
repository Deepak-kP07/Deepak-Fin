'use client'

import { X } from 'lucide-react'

// A read-only detail sheet opened by tapping a Dashboard stat card (Income/Expense/Savings rate)
// — those cards default to the current month, same as everywhere else in the app; this is where
// the life-to-date/yearly numbers behind that one figure actually live. Same modal chrome as
// ConfirmDialog/PromptDialog so it reads as the same family of overlay, just informational rather
// than an action.
export function StatDrilldown({ open, onClose, title, icon: Icon, accent = 'bg-accent-400/15 text-accent-200 light:text-accent-700', rows = [], note }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accent}`}>{Icon && <Icon size={18} />}</div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900"><X size={16} /></button>
        </div>
        <div className="mt-4 text-sm font-semibold text-white light:text-slate-900">{title}</div>
        <div className="mt-3 divide-y divide-white/5 light:divide-black/5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 py-2.5">
              <div>
                <div className="text-sm text-slate-300 light:text-slate-700">{r.label}</div>
                {r.sub && <div className="mt-0.5 text-[11px] text-slate-500">{r.sub}</div>}
              </div>
              <div className={`shrink-0 text-sm font-semibold ${r.tone || 'text-white light:text-slate-900'}`}>{r.value}</div>
            </div>
          ))}
        </div>
        {note && <div className="mt-3 text-[11px] leading-4 text-slate-500">{note}</div>}
      </div>
    </div>
  )
}
