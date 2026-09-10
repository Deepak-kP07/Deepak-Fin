'use client'

import { useState } from 'react'
import { RefreshCw, Sparkles } from 'lucide-react'

// Short, user-facing entries — not raw commit messages. Newest first. Add a new entry at the top
// whenever something user-visible ships; no need to log every internal fix.
const CHANGELOG = [
  {
    date: '06 Sep 2026',
    points: [
      'Investments: SIPs and other assets now count toward your net worth.',
      'Smoother reconnect flow when a Kite session goes stale.',
      'Fixed a few mobile bugs — category picker, Family/Company form, SMS timing.',
    ],
  },
  {
    date: '04 Sep 2026',
    points: ['Push notifications now fix themselves instead of silently going stale.'],
  },
  {
    date: '03 Sep 2026',
    points: [
      'Added push notifications for the Android app, with the real Personal Fin icon.',
      "SMS detection now notifies instantly, and works even when the app isn't already open.",
      'Recognized a few more banks for SMS auto-detect, including Canara Bank.',
    ],
  },
  {
    date: '01 Sep 2026',
    points: [
      'Launched SMS Auto-Detect — bank/UPI messages become transactions automatically (Android app).',
      'Added native Google sign-in for the Android app.',
      'Recognized more banks: Union Bank, IPPB, Paytm, Canara, SBI Card.',
      'Uncategorized SMS transactions now get a guessed category automatically.',
    ],
  },
  {
    date: '31 Aug 2026',
    points: ['Copy-to-clipboard invite messages, a credit card billing-cycle filter, and credit cards can now fund Family/Company entries.'],
  },
  {
    date: '29 Aug 2026',
    points: ['Recurring Family/Company entries, and the app now remembers what you were last viewing.'],
  },
  {
    date: '28 Aug 2026',
    points: ['Choose which account a Money Profile entry posts to, better Family/Company balance syncing, and update notifications added.'],
  },
  {
    date: '27 Aug 2026',
    points: ['Faster CSV imports, drag-and-drop category reordering, a "Clear all data" option, and a mobile-friendly landing page.'],
  },
]

export function SettingsUpdates() {
  const [checking, setChecking] = useState(false)

  // Same mechanism the one-time "A new version is available" toast already uses (app/page.js) —
  // Serwist's skipWaiting+clientsClaim mean a newly found worker takes over on its own, this just
  // forces a check instead of waiting for the browser's own polling, then reloads to pick it up.
  // Unlike the toast, this is reachable any time — so missing that one prompt isn't a dead end.
  const checkForUpdate = async () => {
    setChecking(true)
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration()
        await reg?.update()
      }
    } catch {
      // best-effort — reload happens regardless below
    } finally {
      setTimeout(() => window.location.reload(), 400)
    }
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
