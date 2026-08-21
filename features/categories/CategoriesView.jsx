'use client'

import { Pencil, Plus, Trash2 } from 'lucide-react'

export function CategoriesView({ data, onAdd, onEdit, onDelete }) {
  const { categories } = data
  const grouped = { income: categories.filter((c) => c.type === 'income'), expense: categories.filter((c) => c.type === 'expense') }
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Group your spending</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Categories</h1>
        </div>
        <button onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c]"><Plus size={15} />Add category</button>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {['income', 'expense'].map((k) => (
          <div key={k} className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-semibold capitalize text-white">{k}</div>
              <div className="text-xs text-slate-500">{grouped[k].length}</div>
            </div>
            {grouped[k].length === 0 ? <div className="py-6 text-center text-sm text-slate-500">No {k} categories yet.</div> : (
              <div className="space-y-2">
                {grouped[k].map((c) => (
                  <div key={c.id} className="group flex items-center justify-between rounded-xl bg-white/[.03] px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg" style={{ background: `${c.color || '#94a3b8'}22`, color: c.color }} />
                      <div className="text-sm text-white">{c.name}</div>
                    </div>
                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button onClick={() => onEdit(c)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={14} /></button>
                      <button onClick={() => onDelete(c)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
