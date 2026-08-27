'use client'

import { useEffect, useRef, useState } from 'react'
import { Info } from 'lucide-react'

// Small "(i)" icon that reveals an explanatory note on tap — for a label whose meaning isn't
// obvious on its own (e.g. how a CSV column actually gets interpreted). Tap-to-toggle rather than
// hover-only so it works the same on touch and desktop.
export function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  return (
    <span ref={ref} className="relative inline-flex">
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-slate-500 hover:text-slate-300 hover:light:text-slate-700" aria-label="More info">
        <Info size={13} />
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 z-50 mb-1.5 w-56 -translate-x-1/2 rounded-lg border border-white/10 light:border-black/10 bg-[#1c2230] light:bg-white px-2.5 py-2 text-[11px] font-normal normal-case leading-snug text-slate-300 light:text-slate-700 shadow-xl">
          {text}
        </span>
      )}
    </span>
  )
}
