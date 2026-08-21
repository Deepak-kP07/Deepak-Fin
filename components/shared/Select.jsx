'use client'

import { Children, isValidElement, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

// Custom-styled drop-in replacement for a native <select> — same usage shape
// (value / onChange / <option> children), just rendered as our own themed dropdown
// instead of the browser's default one.
//
// `required` is enforced for real: a zero-opacity native <select required> is layered
// exactly on top of the visible button (pointer-events disabled, so clicks still reach the
// custom dropdown underneath) purely so the browser's own form-validation participates —
// leaving this field on its default/blank value now actually blocks submit with the
// browser's normal "Please select an item" prompt, instead of silently going through.
export function Select({ value, onChange, children, disabled, placeholder, className, required }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const options = []
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === 'option') options.push({ value: child.props.value ?? '', label: child.props.children, disabled: child.props.disabled })
  })
  const currentValue = value ?? ''
  const selected = options.find((o) => String(o.value) === String(currentValue))
  const isEmpty = required && !disabled && (currentValue === '' || currentValue == null)
  const base = className || 'w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none focus:border-cyan-300/50'

  return (
    <div ref={ref} className="relative">
      <button type="button" disabled={disabled} onClick={() => setOpen((o) => !o)} className={`${base} flex items-center justify-between gap-2 text-left disabled:opacity-50 ${isEmpty ? '!border-amber-400/50' : ''}`}>
        <span className={`truncate ${selected && selected.value !== '' ? '' : 'text-slate-500'}`}>{selected ? selected.label : (placeholder || '')}</span>
        <ChevronDown size={15} className={`shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {required && !disabled && (
        <select
          required
          value={currentValue}
          onChange={() => {}}
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full cursor-default opacity-0"
        >
          <option value="" />
          {options.map((o, i) => <option key={`${o.value}-${i}`} value={o.value} />)}
        </select>
      )}
      {open && (
        <div className="absolute left-0 z-30 mt-1 max-h-64 w-max min-w-full max-w-[min(20rem,90vw)] overflow-y-auto rounded-xl border border-white/10 bg-[#141a28] p-1 shadow-2xl">
          {options.map((o, i) => (
            <button key={`${o.value}-${i}`} type="button" disabled={o.disabled} onClick={() => { onChange({ target: { value: o.value } }); setOpen(false) }} className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${String(o.value) === String(currentValue) ? 'bg-cyan-400/15 text-cyan-200' : 'text-slate-300 hover:bg-white/5'} disabled:opacity-40`}>{o.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}
