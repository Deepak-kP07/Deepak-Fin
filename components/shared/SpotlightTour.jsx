'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

// Desktop and mobile render separate DOM elements for the same logical destination (sidebar vs
// bottom-nav/More-sheet) — both tagged with the same data-tour key, so this picks whichever one
// is actually on screen right now.
function findVisibleTarget(selector) {
  if (!selector || typeof document === 'undefined') return null
  const els = document.querySelectorAll(`[data-tour="${selector}"]`)
  for (const el of els) {
    if (el.getClientRects().length > 0) return el
  }
  return null
}

// Tries below/above/right/left of the target, in that order, and takes the first placement that
// fits the viewport — nav items sit at screen edges, so naive "always below" placement would
// overflow for a lot of steps.
function computeTooltipPosition(targetRect, tooltipSize, viewport) {
  const gap = 12
  const candidates = [
    { side: 'bottom', top: targetRect.bottom + gap, left: targetRect.left + targetRect.width / 2 - tooltipSize.width / 2 },
    { side: 'top', top: targetRect.top - tooltipSize.height - gap, left: targetRect.left + targetRect.width / 2 - tooltipSize.width / 2 },
    { side: 'right', top: targetRect.top + targetRect.height / 2 - tooltipSize.height / 2, left: targetRect.right + gap },
    { side: 'left', top: targetRect.top + targetRect.height / 2 - tooltipSize.height / 2, left: targetRect.left - tooltipSize.width - gap },
  ]
  const fits = candidates.find((c) => c.top >= 8 && c.left >= 8 && c.top + tooltipSize.height <= viewport.height - 8 && c.left + tooltipSize.width <= viewport.width - 8)
  const pick = fits || candidates[0]
  return {
    top: Math.min(Math.max(pick.top, 8), Math.max(8, viewport.height - tooltipSize.height - 8)),
    left: Math.min(Math.max(pick.left, 8), Math.max(8, viewport.width - tooltipSize.width - 8)),
  }
}

// A live walkthrough that spotlights real nav items and Settings panels rather than a static
// slideshow — see features/onboarding/tourSteps.js for this app's actual step content. `context`
// is forwarded to each step's onEnter(context) so a step can drive real navigation before its
// target is measured. Generic/reusable: nothing here is specific to any one tour's content.
export function SpotlightTour({ steps, open, context, onSkip, onFinish }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState(null)
  const [tooltipPos, setTooltipPos] = useState(null)
  // A callback ref (not a plain ref) so re-measuring fires exactly when AnimatePresence swaps in
  // a new tooltip node — a plain ref's identity change doesn't trigger a re-render/effect on its
  // own, which would otherwise leave `tooltipPos` measured against the *previous* step's node.
  const [tooltipNode, setTooltipNode] = useState(null)
  const step = steps[stepIndex] || null

  useEffect(() => { if (open) setStepIndex(0) }, [open])

  const measure = useCallback(() => {
    if (!step?.targetSelector) { setRect(null); return }
    const el = findVisibleTarget(step.targetSelector)
    setRect(el ? el.getBoundingClientRect() : null)
  }, [step])

  // On mobile, a step's onEnter can open the "More"/Settings-picker sheet — those slide in over
  // ~200-400ms (vaul's own transition), so the target isn't at its final position for a beat
  // after it appears in the DOM. A single measurement right after mount would catch it mid-slide
  // and lock the spotlight onto the wrong spot. This polls (up to ~550ms) until two consecutive
  // reads agree — settling naturally whether the target is instant (desktop, no sheet) or
  // animated in (mobile sheet) — rather than guessing a fixed delay for either case.
  const measureSettled = useCallback((isCancelled) => {
    if (!step?.targetSelector) { setRect(null); return }
    let attempts = 0
    let last = null
    const closeEnough = (a, b) => a && b && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5
    const tick = () => {
      if (isCancelled()) return
      const el = findVisibleTarget(step.targetSelector)
      const r = el ? el.getBoundingClientRect() : null
      if (closeEnough(r, last) || attempts >= 10) { setRect(r); return }
      last = r
      attempts += 1
      setTimeout(tick, 50)
    }
    tick()
  }, [step])

  const goNext = useCallback(() => {
    setStepIndex((i) => {
      if (i >= steps.length - 1) { onFinish(); return i }
      return i + 1
    })
  }, [steps.length, onFinish])
  const goBack = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), [])

  useEffect(() => {
    if (!open || !step) return
    step.onEnter?.(context)
    let cancelled = false
    // One rAF lets React commit the onEnter-triggered navigation before the settle-poll starts
    // looking for the target at all.
    const raf1 = requestAnimationFrame(() => measureSettled(() => cancelled))
    return () => { cancelled = true; cancelAnimationFrame(raf1) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stepIndex])

  useEffect(() => {
    if (!open) return
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [open, measure])

  useEffect(() => {
    if (!rect || !tooltipNode) { setTooltipPos(null); return }
    const update = () => {
      const size = tooltipNode.getBoundingClientRect()
      setTooltipPos(computeTooltipPosition(rect, { width: size.width, height: size.height }, { width: window.innerWidth, height: window.innerHeight }))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(tooltipNode)
    return () => ro.disconnect()
  }, [rect, tooltipNode])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onSkip() }
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onSkip, goNext, goBack])

  if (!open || !step) return null

  const isLast = stepIndex === steps.length - 1
  const Icon = step.icon

  // One persistent box for the whole tour (never remounted between steps) — framer-motion
  // interpolates `animate`'s numeric values automatically, so the spotlight glides from the old
  // target to the new one instead of jump-cutting. "No target" is expressed as the box exactly
  // covering the viewport: its box-shadow "hole" then equals the full screen, i.e. no visible
  // cutout at all — same element, same animation, no separate plain-backdrop case to jump to.
  const viewport = { width: typeof window !== 'undefined' ? window.innerWidth : 0, height: typeof window !== 'undefined' ? window.innerHeight : 0 }
  const box = rect
    ? { top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12, borderRadius: 16 }
    : { top: 0, left: 0, width: viewport.width, height: viewport.height, borderRadius: 0 }

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Invisible full-screen layer — blocks interacting with the real page while touring;
          dimming itself comes from the spotlight box's box-shadow. */}
      <div className="fixed inset-0" />
      <motion.div
        className="pointer-events-none fixed"
        style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,.6)' }}
        animate={box}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
      />

      {/* Position lives on this plain wrapper, not the animated motion.div below — framer-motion
          takes full ownership of an animated element's `transform` (it's how `y` gets applied),
          so a manual `transform: translate(-50%,-50%)` on the same node gets silently overwritten,
          collapsing the "no target" centered fallback to the screen's top-left corner. */}
      <div
        className="fixed z-[61] w-[min(320px,calc(100vw-32px))]"
        style={tooltipPos ? { top: tooltipPos.top, left: tooltipPos.left } : { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            ref={setTooltipNode}
            key={`tooltip-${stepIndex}`}
            className="rounded-2xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-5 shadow-2xl"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                {Icon && <Icon size={16} className="shrink-0 text-accent-300 light:text-accent-700" />}
                <div className="text-sm font-semibold text-white light:text-slate-900">{step.title}</div>
              </div>
              <button onClick={onSkip} className="shrink-0 rounded-lg p-1 text-slate-500 transition hover:bg-white/10 hover:text-white" title="Skip tour"><X size={14} /></button>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400 light:text-slate-600">{step.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">{stepIndex + 1} / {steps.length}</span>
              <div className="flex items-center gap-2">
                {stepIndex > 0 && <button onClick={goBack} className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 light:text-slate-500 hover:bg-white/5">Back</button>}
                <button onClick={goNext} className="rounded-lg bg-gradient-to-r from-accent-300 to-accent-600 px-3.5 py-1.5 text-xs font-semibold text-[#07101c]">{isLast ? 'Finish' : 'Next'}</button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
