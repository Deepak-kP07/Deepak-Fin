'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'

// Themed replacement for window.prompt — call as `await prompt.ask('label', { defaultValue })`,
// resolves to the entered string, or null if cancelled — same contract as window.prompt, just
// rendered as our own modal instead of the browser's native dialog.
export function usePrompt() {
  const [state, setState] = useState(null)
  const [value, setValue] = useState('')
  const ask = (message, opts = {}) => new Promise((resolve) => {
    setValue(opts.defaultValue != null ? String(opts.defaultValue) : '')
    setState({ message, resolve, confirmLabel: opts.confirmLabel || 'Save', inputType: opts.inputType || 'text', placeholder: opts.placeholder || '' })
  })
  const close = (result) => { state?.resolve(result); setState(null) }
  const view = state && (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => close(null)}>
      <form onSubmit={(e) => { e.preventDefault(); close(value) }} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6 shadow-2xl">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-400/15 text-accent-200 light:text-accent-700"><Pencil size={18} /></div>
        <p className="mt-4 text-sm text-slate-200 light:text-slate-700">{state.message}</p>
        <input
          autoFocus
          type={state.inputType}
          step={state.inputType === 'number' ? 'any' : undefined}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={state.placeholder}
          onFocus={(e) => e.target.select()}
          className="mt-3 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-2.5 text-white light:text-slate-900 outline-none focus:border-accent-300/50"
        />
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => close(null)} className="rounded-xl border border-white/10 light:border-black/10 px-4 py-2.5 text-sm text-slate-300 light:text-slate-700 hover:bg-white/5">Cancel</button>
          <button type="submit" className="rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-4 py-2.5 text-sm font-semibold text-[#07101c] hover:opacity-90">{state.confirmLabel}</button>
        </div>
      </form>
    </div>
  )
  return { ask, view }
}
