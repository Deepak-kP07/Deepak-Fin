'use client'

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { getCategoryIcon } from '@/lib/categoryIcons'

// A small delight touch next to a category picker — pops in with a quick bounce whenever the
// selected category actually changes (keyed on category id, so re-renders with the same
// selection don't replay it). Falls back to a neutral sparkle bubble when nothing's picked yet,
// so the field never looks broken and never shifts layout when a category is chosen/cleared.
export function CategoryAnimatedIcon({ category, size = 34 }) {
  const reduceMotion = useReducedMotion()
  const Icon = getCategoryIcon(category?.name)
  const color = category?.color || '#94a3b8'
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={category?.id || 'none'}
        initial={reduceMotion ? false : { scale: 0.3, rotate: -8, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 14 }}
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{ width: size, height: size, background: `${color}22` }}
      >
        <Icon size={Math.round(size * 0.55)} style={{ color }} />
      </motion.div>
    </AnimatePresence>
  )
}
