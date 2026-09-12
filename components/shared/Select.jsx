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
// Type-ahead threshold — below this many options, filtering just adds friction (nothing to
// narrow down), so typing falls back to the browser's native jump-to-match behavior instead.
const FILTER_THRESHOLD = 8
const TYPEAHEAD_RESET_MS = 1200

export function Select({ value, onChange, children, disabled, placeholder, className, required }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)
  const resetTimer = useRef(null)
  useEffect(() => {
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])
  useEffect(() => { if (!open) setQuery('') }, [open])
  useEffect(() => () => clearTimeout(resetTimer.current), [])

  const options = []
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === 'option') options.push({ value: child.props.value ?? '', label: child.props.children, disabled: child.props.disabled })
  })
  const currentValue = value ?? ''
  const selected = options.find((o) => String(o.value) === String(currentValue))
  const isEmpty = required && !disabled && (currentValue === '' || currentValue == null)
  const base = className || 'w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50 glassy:glass-pill'

  // No visible search field — a long list (categories, accounts) is filtered just by typing
  // while the dropdown is open, same as this button's own focus state already allows; short
  // lists (Type, Yes/No, etc.) aren't worth filtering and keep plain native type-ahead instead.
  const filterable = options.length > FILTER_THRESHOLD
  const q = query.trim().toLowerCase()
  const visible = filterable && q
    ? options.filter((o) => String(o.label ?? '').toLowerCase().includes(q))
    : options

  const onKeyDown = (e) => {
    if (!filterable) return
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'Backspace') { e.preventDefault(); setQuery((q) => q.slice(0, -1)); clearTimeout(resetTimer.current); resetTimer.current = setTimeout(() => setQuery(''), TYPEAHEAD_RESET_MS); return }
    if (e.key === 'Enter') {
      if (open && query && visible[0] && !visible[0].disabled) { e.preventDefault(); onChange({ target: { value: visible[0].value } }); setOpen(false) }
      return
    }
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault()
      if (!open) setOpen(true)
      setQuery((q) => q + e.key)
      clearTimeout(resetTimer.current)
      resetTimer.current = setTimeout(() => setQuery(''), TYPEAHEAD_RESET_MS)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" disabled={disabled} onClick={() => setOpen((o) => !o)} onKeyDown={onKeyDown} className={`${base} flex items-center justify-between gap-2 text-left disabled:opacity-50 ${isEmpty ? '!border-amber-400/50' : ''}`}>
        <span className={`truncate ${selected && selected.value !== '' ? '' : 'text-slate-500'}`}>{open && query ? `“${query}”` : selected ? selected.label : (placeholder || '')}</span>
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
        <div className="absolute left-0 z-30 mt-1 max-h-64 w-max min-w-full max-w-[min(20rem,90vw)] overflow-y-auto rounded-xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-1 shadow-2xl glassy:glass-card">
          {visible.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">No matches</div>
          ) : visible.map((o, i) => (
            <button key={`${o.value}-${i}`} type="button" disabled={o.disabled} onClick={() => { onChange({ target: { value: o.value } }); setOpen(false) }} className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${String(o.value) === String(currentValue) ? 'bg-accent-400/15 text-accent-200 light:text-accent-700' : 'text-slate-300 light:text-slate-700 hover:bg-white/5'} disabled:opacity-40`}>{o.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}
