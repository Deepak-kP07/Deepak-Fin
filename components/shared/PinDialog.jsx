'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Lock } from 'lucide-react'

// PIN entry for hidden transactions. Built on Radix Dialog (not a plain portal like
// PromptDialog/ConfirmDialog) because it has a text input: when opened from a form inside a mobile
// BottomSheet, vaul's focus trap would pull focus straight back out of a plain input. A nested
// Radix dialog pauses that trap while it's open. Stays open on a failed attempt: `submit(pin)`
// must resolve { ok } or { error }, and the error is shown inline. Resolves true once `submit`
// succeeds, false if cancelled.
export function usePinDialog() {
  const [state, setState] = useState(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const ask = ({ title, message, confirmLabel = 'Unlock', submit, footer = null }) => new Promise((resolve) => {
    setPin(''); setError(''); setBusy(false)
    setState({ title, message, confirmLabel, submit, footer, resolve })
  })
  const close = (result) => { state?.resolve(result); setState(null) }
  const onSubmit = async (e) => {
    e.preventDefault()
    if (!/^\d{4,6}$/.test(pin)) { setError('Enter 4 to 6 digits.'); return }
    setBusy(true); setError('')
    const result = await state.submit(pin)
    setBusy(false)
    if (result?.ok) close(true)
    else { setError(result?.error || 'Something went wrong'); setPin('') }
  }
  const view = (
    <Dialog.Root open={!!state} onOpenChange={(open) => { if (!open) close(false) }}>
      <Dialog.Portal>
        <Dialog.Overlay data-app-dialog="" className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" />
        {state && (
          <Dialog.Content
            data-app-dialog=""
            aria-describedby={undefined}
            className="fixed left-1/2 top-1/2 z-[71] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6 shadow-2xl outline-none glassy:glass-card"
          >
            <form onSubmit={onSubmit}>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-400/15 text-accent-200 light:text-accent-700"><Lock size={18} /></div>
              <Dialog.Title className="mt-4 text-sm font-semibold text-white light:text-slate-900">{state.title}</Dialog.Title>
              {state.message && <p className="mt-1 text-xs text-slate-400 light:text-slate-500">{state.message}</p>}
              <input
                autoFocus
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                aria-label="PIN"
                className="mt-4 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-2.5 text-center text-lg tracking-[0.4em] text-white light:text-slate-900 outline-none focus:border-accent-300/50"
              />
              {error && <p role="alert" className="mt-2 text-xs text-rose-300 light:text-rose-700">{error}</p>}
              {state.footer && <div className="mt-3 text-[11px] text-slate-500">{state.footer}</div>}
              <div className="mt-6 flex justify-end gap-2">
                <button type="button" onClick={() => close(false)} className="rounded-xl border border-white/10 light:border-black/10 px-4 py-2.5 text-sm text-slate-300 light:text-slate-700 hover:bg-white/5">Cancel</button>
                <button type="submit" disabled={busy} className="rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-4 py-2.5 text-sm font-semibold text-[#07101c] hover:opacity-90 disabled:opacity-60">{busy ? 'Checking…' : state.confirmLabel}</button>
              </div>
            </form>
          </Dialog.Content>
        )}
      </Dialog.Portal>
    </Dialog.Root>
  )
  return { ask, view }
}
