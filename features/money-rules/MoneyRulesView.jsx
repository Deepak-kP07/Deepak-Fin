'use client'

import { useState } from 'react'
import { Star, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { capitalizeFirst } from '@/lib/format'

export function MoneyRulesView({ data, onAdd, onToggle, onEdit, onDelete }) {
  const { money_rules } = data
  const [text, setText] = useState('')
  const submit = async (e) => { e.preventDefault(); if (!text.trim()) return; await onAdd(text.trim()); setText('') }
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 text-xs uppercase tracking-widest text-accent-200/70 light:text-accent-700">Your compass</div>
        <h1 className="text-3xl font-semibold tracking-tight text-white light:text-slate-900">Money rules</h1>
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Save 30% of every paycheck before spending" className="flex-1 rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-4 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
        <button className="rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-5 py-3 text-sm font-semibold text-[#07101c]">+ Add</button>
      </form>
      {money_rules.length === 0 ? (
        <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card">
          <EmptyState icon={Star} title="No rules yet" message="Write down your personal money principles. They&apos;ll appear on the dashboard as a gentle reminder." />
        </div>
      ) : (
        <div className="space-y-2">
          {money_rules.map((r, i) => (
            <div key={r.id} className="group flex items-center gap-3 rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-400/15 text-xs font-semibold text-accent-200 light:text-accent-700">{i + 1}</div>
              <div className={`flex-1 text-sm ${r.is_active ? 'text-white light:text-slate-900' : 'text-slate-500 line-through'}`}>{capitalizeFirst(r.rule_text)}</div>
              <button onClick={() => onToggle(r)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${r.is_active ? 'bg-emerald-400/15 text-emerald-200 light:text-emerald-700 hover:bg-emerald-400/25' : 'bg-white/[.06] light:bg-black/[.04] text-slate-400 light:text-slate-500 hover:bg-white/[.1] hover:light:bg-black/[.06]'}`}>{r.is_active ? 'Active' : 'Off'}</button>
              <button onClick={() => onDelete(r)} className="rounded-lg p-1.5 text-rose-300/70 light:text-rose-700 opacity-100 transition hover:bg-rose-300/10 lg:opacity-0 lg:group-hover:opacity-100"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
