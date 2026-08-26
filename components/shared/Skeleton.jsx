'use client'

import { motion } from 'framer-motion'

// The app's one standard loading treatment (DESIGN.md: "a Glass Fill block breathing in
// opacity... matching the vault's 'settle, don't announce' character") — a slow, gentle
// opacity pulse rather than a shimmer or spinner, used everywhere data is still loading.
export function Skeleton({ className = '' }) {
  return (
    <motion.div
      className={`rounded-xl bg-white/[.04] light:bg-black/[.03] ${className}`}
      animate={{ opacity: [0.55, 1, 0.55] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}
