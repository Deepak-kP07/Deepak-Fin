'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react'

const MODULE_OPTIONS = [
  { key: 'transactions', label: 'Transactions' },
  { key: 'budgets', label: 'Budgets' },
  { key: 'recurring', label: 'Recurring' },
  { key: 'credit_card_spend', label: 'Credit card spend' },
  { key: 'family_company', label: 'Family / Company' },
]

export function SettingsCategories({ data, onAddCategory, onEditCategory, onDeleteCategory, onReorderCategory, onToggleCategoryModule }) {
  const { categories } = data
  const [type, setType] = useState('expense')
  const rows = categories.filter((c) => c.type === type).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-white">Categories</div>
          <div className="text-xs text-slate-500">Reorder them, and check which modules each one appears in.</div>
        </div>
        <button onClick={() => onAddCategory(type)} className="flex items-center gap-1 rounded-xl bg-white/[.06] px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/[.1]"><Plus size={13} />Add</button>
      </div>

      <div className="mt-4 flex gap-1.5 rounded-xl bg-black/20 p-1">
        {['expense', 'income'].map((t) => (
          <button key={t} onClick={() => setType(t)} className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize transition ${type === t ? 'bg-accent-400/15 text-accent-200' : 'text-slate-400 hover:text-white'}`}>{t}</button>
        ))}
      </div>

      {/* Desktop: the full grid table, module columns side by side. Mobile: a stacked card per
          category with module toggles wrapping as chips instead of forcing sideways scroll to
          reach a fixed-width table — genuinely usable with a thumb, not just non-overflowing. */}
      <div className="mt-4 hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-slate-500">
              <th className="px-2 py-2 text-left">Category</th>
              {MODULE_OPTIONS.map((m) => <th key={m.key} className="px-2 py-2 text-center">{m.label}</th>)}
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={MODULE_OPTIONS.length + 2} className="px-2 py-6 text-center text-sm text-slate-500">No {type} categories yet</td></tr>
            ) : rows.map((c, i) => (
              <tr key={c.id} className="border-t border-white/5">
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <button disabled={i === 0} onClick={() => onReorderCategory(c, rows[i - 1])} className="rounded p-0.5 text-slate-500 hover:text-white disabled:opacity-20"><ChevronUp size={12} /></button>
                      <button disabled={i === rows.length - 1} onClick={() => onReorderCategory(c, rows[i + 1])} className="rounded p-0.5 text-slate-500 hover:text-white disabled:opacity-20"><ChevronDown size={12} /></button>
                    </div>
                    <div className="h-5 w-5 shrink-0 rounded-md" style={{ background: `${c.color || '#94a3b8'}33` }} />
                    <span className="truncate text-white">{c.name}</span>
                  </div>
                </td>
                {MODULE_OPTIONS.map((m) => {
                  const hidden = (c.hidden_in_modules || []).includes(m.key)
                  return (
                    <td key={m.key} className="px-2 py-2 text-center">
                      <input type="checkbox" checked={!hidden} onChange={() => onToggleCategoryModule(c, m.key)} className="h-4 w-4 rounded border-white/20 bg-transparent accent-accent-400" />
                    </td>
                  )
                })}
                <td className="px-2 py-2">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => onEditCategory(c)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={13} /></button>
                    <button onClick={() => onDeleteCategory(c)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-2.5 sm:hidden">
        {rows.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-slate-500">No {type} categories yet</div>
        ) : rows.map((c, i) => (
          <div key={c.id} className="rounded-xl border border-white/10 bg-white/[.02] p-3">
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <button disabled={i === 0} onClick={() => onReorderCategory(c, rows[i - 1])} className="rounded p-0.5 text-slate-500 hover:text-white disabled:opacity-20"><ChevronUp size={12} /></button>
                <button disabled={i === rows.length - 1} onClick={() => onReorderCategory(c, rows[i + 1])} className="rounded p-0.5 text-slate-500 hover:text-white disabled:opacity-20"><ChevronDown size={12} /></button>
              </div>
              <div className="h-5 w-5 shrink-0 rounded-md" style={{ background: `${c.color || '#94a3b8'}33` }} />
              <span className="min-w-0 flex-1 truncate text-white">{c.name}</span>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => onEditCategory(c)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={13} /></button>
                <button onClick={() => onDeleteCategory(c)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={13} /></button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {MODULE_OPTIONS.map((m) => {
                const hidden = (c.hidden_in_modules || []).includes(m.key)
                return (
                  <label key={m.key} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${hidden ? 'border-white/10 text-slate-500' : 'border-accent-400/30 bg-accent-400/10 text-accent-200'}`}>
                    <input type="checkbox" checked={!hidden} onChange={() => onToggleCategoryModule(c, m.key)} className="h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-accent-400" />
                    {m.label}
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
