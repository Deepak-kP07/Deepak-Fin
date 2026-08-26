'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

// Captures the browser's raw `beforeinstallprompt` event (Chrome/Edge/Android — Safari/iOS has
// no equivalent and relies on the manual "Share > Add to Home Screen" flow instead, so this
// simply never fires there) and re-shows it as an on-brand CTA instead of leaving the decision to
// whatever the browser's own default prompt looks like. Dismissing is remembered for the session
// only — a user who says "not now" today isn't locked out of ever seeing it again tomorrow.
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    setInstalled(isStandalone)
    const onBeforeInstall = (e) => { e.preventDefault(); setDeferredPrompt(e) }
    const onInstalled = () => { setInstalled(true); setDeferredPrompt(null) }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed || dismissed || !deferredPrompt) return null

  const install = async () => {
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  return (
    <div className="fixed inset-x-4 bottom-24 z-40 flex items-center gap-3 rounded-2xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white/95 p-3.5 shadow-2xl backdrop-blur-xl lg:inset-x-auto lg:bottom-8 lg:left-8 lg:w-80">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-400/15 text-accent-200 light:text-accent-700">
        <Download size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white light:text-slate-900">Install the app</div>
        <div className="text-xs text-slate-400 light:text-slate-500">Faster, full-screen, works offline.</div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button onClick={install} className="rounded-lg bg-gradient-to-r from-accent-300 to-accent-500 px-3 py-1.5 text-xs font-semibold text-[#07101c]">Install</button>
        <button onClick={() => setDismissed(true)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900" title="Dismiss"><X size={14} /></button>
      </div>
    </div>
  )
}
