'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Pencil } from 'lucide-react'

// Category picker, specialized rather than reusing the generic Select — categories tend to run
// long enough that a single scrolling column hides most of them; laying them out as a grid
// surfaces far more at once. The pencil icon opens the same add-category flow as Profile.
// `open`/`onOpenChange` are optional — omit them and this manages its own open state exactly as
// before. Pass them when a caller needs to know/control whether the dropdown is open (e.g. to
// reserve layout space for it, as BudgetMonthForm's repeated rows do) without changing behavior
// for every other existing caller.
//
// The panel is portaled to document.body and positioned with `fixed` coordinates computed from
// the trigger button's own rect, instead of the usual `absolute` dropdown pattern — every caller
// renders this inside a scrolling modal/sheet (`overflow-y-auto`), which would otherwise clip an
// absolutely-positioned panel at the modal's edge before the user could see or scroll to the rest
// of the list. It flips above the trigger when there isn't enough room below.
export function CategorySelect({ value, onChange, categories, onAddCategory, className, placeholder = 'No category', open: openProp, onOpenChange }) {
  const [openState, setOpenState] = useState(false)
  const open = openProp !== undefined ? openProp : openState
  const setOpen = (next) => { onOpenChange?.(next); if (openProp === undefined) setOpenState(next) }
  const btnRef = useRef(null)
  const panelRef = useRef(null)
  const [rect, setRect] = useState(null)

  useEffect(() => {
    const onDocClick = (e) => {
      if (btnRef.current?.contains(e.target)) return
      if (panelRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    if (!open) return
    const update = () => { if (btnRef.current) setRect(btnRef.current.getBoundingClientRect()) }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  const selected = categories.find((c) => String(c.id) === String(value))
  const base = className || 'w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50'

  const PANEL_MAX = 320
  const spaceBelow = rect ? window.innerHeight - rect.bottom : 0
  const spaceAbove = rect ? rect.top : 0
  const openUpward = !!rect && spaceBelow < PANEL_MAX && spaceAbove > spaceBelow
  const maxHeight = rect ? Math.max(160, Math.min(PANEL_MAX, (openUpward ? spaceAbove : spaceBelow) - 12)) : PANEL_MAX
  const panelMaxWidth = rect ? Math.min(384, window.innerWidth - 24) : 384
  const left = rect ? Math.min(rect.left, window.innerWidth - panelMaxWidth - 12) : 0

  return (
    <div className="relative">
      <button ref={btnRef} type="button" onClick={() => setOpen(!open)} className={`${base} flex items-center justify-between gap-2 text-left`}>
        <span className={`truncate ${selected ? '' : 'text-slate-500'}`}>{selected ? selected.name : placeholder}</span>
        <ChevronDown size={15} className={`shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && rect && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            left,
            minWidth: rect.width,
            maxWidth: panelMaxWidth,
            maxHeight,
            ...(openUpward ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
          }}
          className="z-[60] w-max overflow-y-auto rounded-xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-3 shadow-2xl"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Categories</span>
            {onAddCategory && (
              <button type="button" onClick={() => { setOpen(false); onAddCategory() }} className="rounded-lg p-1 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-accent-200 hover:light:text-accent-700" title="Add new category"><Pencil size={13} /></button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            <button type="button" onClick={() => { onChange({ target: { value: '' } }); setOpen(false) }} className={`rounded-lg px-3 py-2 text-left text-sm transition ${!value ? 'bg-accent-400/15 text-accent-200 light:text-accent-700' : 'text-slate-300 light:text-slate-700 hover:bg-white/5'}`}>{placeholder}</button>
            {categories.map((c) => (
              <button key={c.id} type="button" onClick={() => { onChange({ target: { value: c.id } }); setOpen(false) }} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-left text-sm transition ${String(value) === String(c.id) ? 'bg-accent-400/15 text-accent-200 light:text-accent-700' : 'text-slate-300 light:text-slate-700 hover:bg-white/5'}`}>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color || '#94a3b8' }} />
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
