'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

const TONES = {
  cyan: 'border-accent-300/20 bg-accent-300/5 text-accent-200 light:text-accent-700',
  amber: 'border-amber-300/20 bg-amber-300/5 text-amber-200 light:text-amber-700',
  slate: 'border-slate-500/25 bg-slate-500/5 text-slate-300 light:text-slate-700',
}

// A dismiss-for-this-visit status banner — clicking the × hides it immediately, but the
// dismissal isn't persisted anywhere, so it comes back on the next page load/navigation if the
// underlying condition (closed profile, EMI due soon, etc.) still applies. That's intentional:
// these often carry real state the user should still be warned about later, just not forced to
// stare at right now.
export function DismissibleBanner({ tone = 'cyan', className = '', children }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div className={`flex items-start gap-2 rounded-xl border px-4 py-2.5 text-xs ${TONES[tone] || TONES.cyan} ${className}`}>
      <div className="min-w-0 flex-1">{children}</div>
      <button type="button" onClick={() => setDismissed(true)} className="shrink-0 rounded-lg p-0.5 opacity-60 transition hover:bg-white/10 hover:opacity-100" title="Dismiss"><X size={14} /></button>
    </div>
  )
}
