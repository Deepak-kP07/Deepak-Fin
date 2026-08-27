'use client'

import { useEffect, useState } from 'react'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CheckCircle2, Circle, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'

const MODULE_OPTIONS = [
  { key: 'transactions', label: 'Transactions' },
  { key: 'budgets', label: 'Budgets' },
  { key: 'recurring', label: 'Recurring' },
  { key: 'credit_card_spend', label: 'Credit card spend' },
  { key: 'family_company', label: 'Family / Company' },
]

function SortableCategoryTableRow({ c, onEditCategory, onDeleteCategory, onToggleCategoryModule }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.id })
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }
  return (
    <tr ref={setNodeRef} style={style} className={`border-t border-white/5 light:border-black/5 bg-[#0e121c] light:bg-white ${isDragging ? 'opacity-60' : ''}`}>
      <td className="px-2 py-2">
        <div className="flex items-center gap-2">
          <button type="button" {...attributes} {...listeners} className="shrink-0 touch-none rounded p-1 text-slate-500 hover:text-white hover:light:text-slate-900 active:cursor-grabbing" title="Drag to reorder"><GripVertical size={14} /></button>
          <div className="h-5 w-5 shrink-0 rounded-md" style={{ background: `${c.color || '#94a3b8'}33` }} />
          <span className="truncate text-white light:text-slate-900">{c.name}</span>
        </div>
      </td>
      {MODULE_OPTIONS.map((m) => {
        const hidden = (c.hidden_in_modules || []).includes(m.key)
        return (
          <td key={m.key} className="px-2 py-2 text-center">
            <button
              type="button"
              onClick={() => onToggleCategoryModule(c, m.key)}
              aria-pressed={!hidden}
              aria-label={`${hidden ? 'Show' : 'Hide'} in ${m.label}`}
              className={`rounded-full p-0.5 transition ${hidden ? 'text-slate-600 hover:text-slate-400 hover:light:text-slate-500' : 'text-accent-300 light:text-accent-700'}`}
            >
              {hidden ? <Circle size={16} /> : <CheckCircle2 size={16} />}
            </button>
          </td>
        )
      })}
      <td className="px-2 py-2">
        <div className="flex justify-end gap-1">
          <button onClick={() => onEditCategory(c)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900"><Pencil size={13} /></button>
          <button onClick={() => onDeleteCategory(c)} className="rounded-lg p-1.5 text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={13} /></button>
        </div>
      </td>
    </tr>
  )
}

function SortableCategoryCard({ c, onEditCategory, onDeleteCategory, onToggleCategoryModule }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.id })
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }
  return (
    <div ref={setNodeRef} style={style} className={`rounded-xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02] p-3 ${isDragging ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2">
        <button type="button" {...attributes} {...listeners} className="shrink-0 touch-none rounded p-1 text-slate-500 hover:text-white hover:light:text-slate-900 active:cursor-grabbing" title="Drag to reorder"><GripVertical size={16} /></button>
        <div className="h-5 w-5 shrink-0 rounded-md" style={{ background: `${c.color || '#94a3b8'}33` }} />
        <span className="min-w-0 flex-1 truncate text-white light:text-slate-900">{c.name}</span>
        <div className="flex shrink-0 gap-1">
          <button onClick={() => onEditCategory(c)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900"><Pencil size={13} /></button>
          <button onClick={() => onDeleteCategory(c)} className="rounded-lg p-1.5 text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={13} /></button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {MODULE_OPTIONS.map((m) => {
          const hidden = (c.hidden_in_modules || []).includes(m.key)
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onToggleCategoryModule(c, m.key)}
              aria-pressed={!hidden}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${hidden ? 'text-slate-500 hover:text-slate-300 hover:light:text-slate-700' : 'bg-accent-400/10 text-accent-200 light:text-accent-700'}`}
            >
              {hidden ? <Circle size={14} className="shrink-0 text-slate-600" /> : <CheckCircle2 size={14} className="shrink-0" />}
              <span className="truncate">{m.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function SettingsCategories({ data, onAddCategory, onEditCategory, onDeleteCategory, onReorderCategories, onToggleCategoryModule }) {
  const { categories } = data
  const [type, setType] = useState('expense')
  const savedRows = categories.filter((c) => c.type === type).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
  // Same instant-drop pattern as SettingsAccounts: render this local copy immediately on drop so
  // the row doesn't snap back while the PATCH round-trip is in flight, then let the server's own
  // order take back over once `data.categories` (or the active type tab) catches up.
  const [localRows, setLocalRows] = useState(null)
  useEffect(() => { setLocalRows(null) }, [data.categories, type])
  const rows = localRows || savedRows

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const ids = rows.map((r) => r.id)
    const reordered = arrayMove(rows, ids.indexOf(active.id), ids.indexOf(over.id))
    setLocalRows(reordered)
    onReorderCategories(reordered)
  }

  return (
    <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-white light:text-slate-900">Categories</div>
          <div className="text-xs text-slate-500">Drag to reorder them, and check which modules each one appears in.</div>
        </div>
        <button onClick={() => onAddCategory(type)} className="flex items-center gap-1 rounded-xl bg-white/[.06] light:bg-black/[.04] px-3 py-1.5 text-xs font-semibold text-white light:text-slate-900 hover:bg-white/[.1] hover:light:bg-black/[.06]"><Plus size={13} />Add</button>
      </div>

      <div className="mt-4 flex gap-1.5 rounded-xl bg-black/20 light:bg-black/[.06] p-1">
        {['expense', 'income'].map((t) => (
          <button key={t} onClick={() => setType(t)} className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize transition ${type === t ? 'bg-accent-400/15 text-accent-200 light:text-accent-700' : 'text-slate-400 light:text-slate-500 hover:text-white hover:light:text-slate-900'}`}>{t}</button>
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
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                  {rows.map((c) => (
                    <SortableCategoryTableRow key={c.id} c={c} onEditCategory={onEditCategory} onDeleteCategory={onDeleteCategory} onToggleCategoryModule={onToggleCategoryModule} />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-2.5 sm:hidden">
        {rows.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-slate-500">No {type} categories yet</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              {rows.map((c) => (
                <SortableCategoryCard key={c.id} c={c} onEditCategory={onEditCategory} onDeleteCategory={onDeleteCategory} onToggleCategoryModule={onToggleCategoryModule} />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}
