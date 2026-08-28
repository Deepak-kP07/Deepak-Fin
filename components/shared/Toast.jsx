'use client'

import { useState } from 'react'

export function useToast() {
  const [toasts, setToasts] = useState([])
  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id))
  // `persist` skips the auto-dismiss timer entirely — for a toast the user needs to actually act
  // on (e.g. "a new version is available, refresh"), vanishing on its own after 3-5s defeats the
  // point. `action` renders a small inline button; clicking it fires the callback then dismisses.
  const push = (message, tone = 'success', { action, persist } = {}) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, message, tone, action }])
    if (!persist) {
      // Warnings carry more to read (a balance/limit nudge) than a one-word confirmation, so
      // they stay up longer instead of vanishing at the same pace as a plain success toast.
      setTimeout(() => dismiss(id), tone === 'warning' ? 5000 : 3200)
    }
  }
  const view = (
    <div className="pointer-events-none fixed right-4 top-[calc(env(safe-area-inset-top)+7rem)] z-[60] flex flex-col items-end gap-2 sm:top-4">
      {toasts.map((t) => (
        <div key={t.id} className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-xl ${t.tone === 'error' ? 'border-rose-400/30 bg-rose-500/10 text-rose-100 light:text-rose-800' : t.tone === 'warning' ? 'border-amber-300/30 bg-amber-400/10 text-amber-100 light:text-amber-800' : t.tone === 'info' ? 'border-accent-300/30 bg-accent-400/10 text-accent-100 light:text-accent-700' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100 light:text-emerald-800'}`}>
          <span>{t.message}</span>
          {t.action && (
            <button
              type="button"
              onClick={() => { t.action.onClick(); dismiss(t.id) }}
              className="shrink-0 rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/25"
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
  return { push, view }
}
