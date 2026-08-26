'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

const TONES = {
  cyan: 'border-accent-300/20 bg-accent-300/5 text-accent-200 light:text-accent-700',
  amber: 'border-amber-300/20 bg-amber-300/5 text-amber-200 light:text-amber-700',
  slate: 'border-slate-500/25 bg-slate-500/5 text-slate-300 light:text-slate-700',
}

const STORAGE_PREFIX = 'dismissed_banner:'

function readDismissed(id) {
  if (!id || typeof window === 'undefined') return false
  try { return localStorage.getItem(STORAGE_PREFIX + id) === '1' } catch { return false }
}

// A dismiss-permanently status banner — clicking the × hides it and remembers that in
// localStorage under `id`, so it stays gone across navigation, remounts, and future visits
// instead of resetting every time the view unmounts. `id` must be unique per distinct banner
// instance (typically the record's id plus whatever makes its message change, e.g. a linked
// account or a due-date cycle) so dismissing one doesn't hide an unrelated, later warning that
// happens to reuse the same tone/copy.
export function DismissibleBanner({ id, tone = 'cyan', className = '', children }) {
  const [dismissed, setDismissed] = useState(() => readDismissed(id))
  if (dismissed) return null
  const dismiss = () => {
    setDismissed(true)
    if (id) { try { localStorage.setItem(STORAGE_PREFIX + id, '1') } catch { /* ignore */ } }
  }
  return (
    <div className={`flex items-start gap-2 rounded-xl border px-4 py-2.5 text-xs ${TONES[tone] || TONES.cyan} ${className}`}>
      <div className="min-w-0 flex-1">{children}</div>
      <button type="button" onClick={dismiss} className="shrink-0 rounded-lg p-0.5 opacity-60 transition hover:bg-white/10 hover:opacity-100" title="Dismiss"><X size={14} /></button>
    </div>
  )
}
