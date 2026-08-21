'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Pencil } from 'lucide-react'

// Category picker, specialized rather than reusing the generic Select — categories tend to run
// long enough that a single scrolling column hides most of them; laying them out as a grid
// surfaces far more at once. The pencil icon opens the same add-category flow as Profile.
export function CategorySelect({ value, onChange, categories, onAddCategory, className, placeholder = 'No category' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])
  const selected = categories.find((c) => String(c.id) === String(value))
  const base = className || 'w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none focus:border-cyan-300/50'

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className={`${base} flex items-center justify-between gap-2 text-left`}>
        <span className={`truncate ${selected ? '' : 'text-slate-500'}`}>{selected ? selected.name : placeholder}</span>
        <ChevronDown size={15} className={`shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1 max-h-80 w-max min-w-full max-w-[min(24rem,90vw)] overflow-y-auto rounded-xl border border-white/10 bg-[#141a28] p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Categories</span>
            {onAddCategory && (
              <button type="button" onClick={() => { setOpen(false); onAddCategory() }} className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-cyan-200" title="Add new category"><Pencil size={13} /></button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            <button type="button" onClick={() => { onChange({ target: { value: '' } }); setOpen(false) }} className={`rounded-lg px-3 py-2 text-left text-sm transition ${!value ? 'bg-cyan-400/15 text-cyan-200' : 'text-slate-300 hover:bg-white/5'}`}>{placeholder}</button>
            {categories.map((c) => (
              <button key={c.id} type="button" onClick={() => { onChange({ target: { value: c.id } }); setOpen(false) }} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-left text-sm transition ${String(value) === String(c.id) ? 'bg-cyan-400/15 text-cyan-200' : 'text-slate-300 hover:bg-white/5'}`}>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color || '#94a3b8' }} />
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
