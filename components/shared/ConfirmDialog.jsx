'use client'

import { useState } from 'react'
import { Ban, Trash2 } from 'lucide-react'

// Themed replacement for window.confirm — call as `await confirm('Delete this?')`,
// resolves true/false the same way, just rendered as our own modal instead of the browser's.
// Pass `{ okOnly: true }` for a hard-block notice instead of a yes/no choice — no Cancel button,
// a single acknowledgement button (default label "Okay"), and it always resolves false since
// there's nothing to confirm, just something the caller has already decided not to allow.
export function useConfirm() {
  const [state, setState] = useState(null)
  const ask = (message, opts = {}) => new Promise((resolve) => setState({ message, resolve, confirmLabel: opts.confirmLabel || (opts.okOnly ? 'Okay' : 'Delete'), okOnly: !!opts.okOnly }))
  const close = (result) => { state?.resolve(result); setState(null) }
  const view = state && (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => close(false)}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6 shadow-2xl glassy:glass-card">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-400/15 text-rose-300 light:text-rose-700">{state.okOnly ? <Ban size={18} /> : <Trash2 size={18} />}</div>
        <p className="mt-4 text-sm text-slate-200 light:text-slate-700">{state.message}</p>
        <div className="mt-6 flex justify-end gap-2">
          {!state.okOnly && <button type="button" onClick={() => close(false)} className="rounded-xl border border-white/10 light:border-black/10 px-4 py-2.5 text-sm text-slate-300 light:text-slate-700 hover:bg-white/5">Cancel</button>}
          <button type="button" onClick={() => close(state.okOnly ? false : true)} className="rounded-xl bg-gradient-to-r from-rose-400 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white light:text-slate-900 hover:opacity-90">{state.confirmLabel}</button>
        </div>
      </div>
    </div>
  )
  return { ask, view }
}
