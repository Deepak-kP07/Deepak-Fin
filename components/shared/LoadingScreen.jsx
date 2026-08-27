'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'

// The app-boot loading screen — a slow, breathing pulse on the mark itself rather than a
// spinner, matching DESIGN.md's "settle, don't announce" loading language app-wide.
// If whatever this is waiting on (the auth check, the initial data fetch) hasn't resolved
// within `timeoutMs`, this switches to a "taking longer than expected" state with a manual
// reload — without it, a genuinely hung request (server down, a deadlocked query) leaves the
// user staring at an infinite pulse with no way out, which is the exact stuck screen this is
// meant to prevent.
export function LoadingScreen({ timeoutMs = 12000 }) {
  const [stuck, setStuck] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setStuck(true), timeoutMs)
    return () => clearTimeout(t)
  }, [timeoutMs])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#080b12] light:bg-[#eef1f6] px-6 text-center">
      <motion.div
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[.04] light:bg-black/[.03]"
        animate={{ opacity: [0.6, 1, 0.6], scale: [0.97, 1, 0.97] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <img src="/logo.png" alt="" className="h-11 w-11 rounded-xl object-cover" />
      </motion.div>
      <div className="text-sm text-slate-500">Loading your financial space</div>
      {stuck && (
        <div className="mt-2 flex flex-col items-center gap-3">
          <div className="max-w-xs text-xs text-slate-500">This is taking longer than expected. Check your connection, or try reloading.</div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 rounded-xl bg-white/[.06] light:bg-black/[.04] px-4 py-2 text-sm font-semibold text-white light:text-slate-900 transition hover:bg-white/[.1] hover:light:bg-black/[.06]"
          >
            <RefreshCw size={14} />Reload
          </button>
        </div>
      )}
    </div>
  )
}
