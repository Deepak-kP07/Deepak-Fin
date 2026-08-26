'use client'

import { motion } from 'framer-motion'

// The app-boot loading screen — a slow, breathing pulse on the mark itself rather than a
// spinner, matching DESIGN.md's "settle, don't announce" loading language app-wide.
export function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#080b12] light:bg-[#eef1f6]">
      <motion.div
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[.04] light:bg-black/[.03]"
        animate={{ opacity: [0.6, 1, 0.6], scale: [0.97, 1, 0.97] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <img src="/logo.png" alt="" className="h-11 w-11 rounded-xl object-cover" />
      </motion.div>
      <div className="text-sm text-slate-500">Loading your financial space</div>
    </div>
  )
}
