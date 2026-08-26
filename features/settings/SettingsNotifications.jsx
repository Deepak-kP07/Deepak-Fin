'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { ToggleSwitch } from '@/components/shared/ToggleSwitch'

// Not a profiles column merged through onSaveProfile like the rest of Settings — a push
// subscription is per-device, not per-user, so its truth lives in this browser's own
// Notification.permission + PushManager state, cross-checked against what's actually stored
// server-side (this device's endpoint might have been pruned already if a send to it 404/410'd).
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function SettingsNotifications({ data, onSaveProfile, toast }) {
  const { profile } = data
  const [supported, setSupported] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false)
      return
    }
    navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then((sub) => setEnabled(!!sub)).catch(() => {})
  }, [])

  const enable = async () => {
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { toast.push('Notifications permission was denied', 'error'); return }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      })
      const json = sub.toJSON()
      const response = await fetch('/api/finance/push_subscriptions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }),
      })
      if (!response.ok) throw new Error('Could not save this device’s subscription')
      setEnabled(true)
      toast.push('Notifications enabled on this device')
    } catch (err) {
      toast.push(err.message || 'Could not enable notifications', 'error')
    } finally { setBusy(false) }
  }

  const disable = async () => {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const endpoint = sub.endpoint
        await sub.unsubscribe()
        const response = await fetch('/api/finance/push_subscriptions')
        const rows = response.ok ? await response.json() : []
        const match = rows.find((r) => r.endpoint === endpoint)
        if (match) await fetch(`/api/finance/push_subscriptions/${match.id}`, { method: 'DELETE' })
      }
      setEnabled(false)
      toast.push('Notifications turned off on this device')
    } catch (err) {
      toast.push(err.message || 'Could not turn off notifications', 'error')
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
    <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025] p-5">
      <div className="text-sm font-semibold text-white light:text-slate-900">Push notifications</div>
      {!supported ? (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-black/20 light:bg-black/[.06] px-4 py-3 text-xs text-slate-500">
          <BellOff size={16} />This browser doesn't support push notifications.
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-4 rounded-xl bg-black/20 light:bg-black/[.06] px-4 py-3">
          <div className="flex items-start gap-3">
            <Bell size={16} className="mt-0.5 shrink-0 text-slate-400 light:text-slate-500" />
            <div>
              <div className="text-sm text-white light:text-slate-900">Notify this device</div>
              <div className="mt-0.5 text-xs text-slate-500">Credit card bills due soon, loan EMIs due soon, recurring transactions added, and budget overspend — nothing else.</div>
            </div>
          </div>
          <ToggleSwitch checked={enabled} disabled={busy} onChange={(v) => (v ? enable() : disable())} />
        </div>
      )}
    </div>

    <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025] p-5">
      <div className="text-sm font-semibold text-white light:text-slate-900">Email reports</div>
      <div className="mt-3 flex items-center justify-between gap-4 rounded-xl bg-black/20 light:bg-black/[.06] px-4 py-3">
        <div>
          <div className="text-sm text-white light:text-slate-900">Weekly summary</div>
          <div className="mt-0.5 text-xs text-slate-500">Net worth, income vs expense, budget pace, and upcoming bills — every Monday morning.</div>
        </div>
        <ToggleSwitch checked={profile?.weekly_report_enabled !== false} onChange={(v) => onSaveProfile({ weekly_report_enabled: v })} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-4 rounded-xl bg-black/20 light:bg-black/[.06] px-4 py-3">
        <div>
          <div className="text-sm text-white light:text-slate-900">Monthly summary</div>
          <div className="mt-0.5 text-xs text-slate-500">Your full month recap — net worth change, budget status, and top spending categories.</div>
        </div>
        <ToggleSwitch checked={profile?.monthly_report_enabled !== false} onChange={(v) => onSaveProfile({ monthly_report_enabled: v })} />
      </div>
    </div>
    </div>
  )
}
