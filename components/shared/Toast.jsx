'use client'

import { useState } from 'react'

export function useToast() {
  const [toasts, setToasts] = useState([])
  const push = (message, tone = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, message, tone }])
    // Warnings carry more to read (a balance/limit nudge) than a one-word confirmation, so
    // they stay up longer instead of vanishing at the same pace as a plain success toast.
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'warning' ? 5000 : 3200)
  }
  const view = (
    <div className="pointer-events-none fixed right-4 top-[calc(env(safe-area-inset-top)+7rem)] z-[60] flex flex-col items-end gap-2 sm:top-4">
      {toasts.map((t) => (
        <div key={t.id} className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-xl ${t.tone === 'error' ? 'border-rose-400/30 bg-rose-500/10 text-rose-100 light:text-rose-800' : t.tone === 'warning' ? 'border-amber-300/30 bg-amber-400/10 text-amber-100 light:text-amber-800' : t.tone === 'info' ? 'border-accent-300/30 bg-accent-400/10 text-accent-100 light:text-accent-700' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100 light:text-emerald-800'}`}>{t.message}</div>
      ))}
    </div>
  )
  return { push, view }
}
