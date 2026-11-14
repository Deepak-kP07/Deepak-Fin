'use client'

import { useState } from 'react'
import { RefreshCw, Sparkles } from 'lucide-react'
import { triggerAppUpdate } from '@/lib/pwaUpdate'
import { CHANGELOG } from '@/lib/changelog'

// Short, user-facing entries — not raw commit messages. Newest first. Add a new entry at the top
// whenever something user-visible ships; no need to log every internal fix.

export function SettingsUpdates() {
  const [checking, setChecking] = useState(false)

  // Unlike the one-time "new version available" toast/push, this is reachable any time — so
  // missing that one prompt isn't a dead end.
  const checkForUpdate = async () => {
    setChecking(true)
    await triggerAppUpdate()
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-white light:text-slate-900">
              <RefreshCw size={16} className="text-accent-300 light:text-accent-700" />Check for updates
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              New versions install themselves in the background — if you missed the one-time
              "new version available" prompt, use this to grab the latest version any time.
            </p>
          </div>
          <button
            onClick={checkForUpdate}
            disabled={checking}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-accent-300/20 px-3.5 py-2 text-xs font-semibold text-accent-100 light:text-accent-700 hover:bg-accent-300/30 disabled:opacity-50"
          >
            <RefreshCw size={13} className={checking ? 'animate-spin' : ''} />{checking ? 'Updating…' : 'Update now'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white light:text-slate-900">
          <Sparkles size={16} className="text-accent-300 light:text-accent-700" />What's new
        </div>
        <div className="mt-3 space-y-4">
          {CHANGELOG.map((entry) => (
            <div key={entry.date}>
              <div className="text-[11px] uppercase tracking-widest text-slate-500">{entry.date}</div>
              <ul className="mt-1.5 space-y-1.5">
                {entry.points.map((p, i) => (
                  <li key={i} className="flex gap-2 text-xs leading-5 text-slate-400 light:text-slate-600">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-500" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
