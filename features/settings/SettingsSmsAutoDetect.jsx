'use client'

import { useEffect, useState } from 'react'
import { App } from '@capacitor/app'
import { BatteryWarning, CheckCircle2, Inbox, Smartphone } from 'lucide-react'
import { ToggleSwitch } from '@/components/shared/ToggleSwitch'
import { checkSmsPermission, isNativeSmsAvailable, openBatteryOptimizationSettings, requestSmsPermission } from '@/lib/sms/nativeBridge'

// SMS auto-detect is Android-only, via a separate native-wrapped build of this same app — a
// plain web/PWA tab can't read device SMS. The "Pending" module toggle (Settings > Modules) is
// the master on/off switch (enabling it is what makes the nav tab, and the native listener once
// installed, active); this section only holds the extra opt-in settings, the native permission
// request (only relevant inside the Android app, invisible on a web tab), and reference info.
function NativePermissionCard({ toast }) {
  const [native, setNative] = useState(false)
  const [granted, setGranted] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const isNative = isNativeSmsAvailable()
    setNative(isNative)
    if (!isNative) return
    checkSmsPermission().then(setGranted)
    // Denying once and later granting it from Android's own Settings (exactly what the error
    // toast below tells you to do) never re-ran this check on its own — this screen just kept
    // showing the stale "not granted" state from the one check at mount. Re-checking whenever
    // the app comes back to the foreground (e.g. returning from Settings) is what was missing.
    const listenerPromise = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) checkSmsPermission().then(setGranted)
    })
    return () => { listenerPromise.then((handle) => handle.remove()) }
  }, [])

  if (!native) {
    return (
      <div className="mt-3 flex items-center gap-3 rounded-xl bg-black/20 light:bg-black/[.06] px-4 py-3 text-xs text-slate-500">
        <Smartphone size={16} className="shrink-0" />You're viewing this in a browser — install the Android app to actually detect SMS. This page still lets you manage the settings below.
      </div>
    )
  }

  // Only ever requested from here, after this explanation — never on app launch with no context,
  // per the PRD's onboarding requirement.
  const enable = async () => {
    setBusy(true)
    try {
      const ok = await requestSmsPermission()
      setGranted(ok)
      if (!ok) toast.push('SMS permission was denied — you can grant it later from Android Settings.', 'error')
    } finally { setBusy(false) }
  }

  return (
    <div className="mt-3 space-y-2.5">
      <div className="flex items-center justify-between gap-4 rounded-xl bg-black/20 light:bg-black/[.06] px-4 py-3">
        <div className="flex items-center gap-3">
          {granted ? <CheckCircle2 size={16} className="shrink-0 text-emerald-300 light:text-emerald-700" /> : <Smartphone size={16} className="shrink-0 text-slate-400 light:text-slate-500" />}
          <div>
            <div className="text-sm text-white light:text-slate-900">SMS permission</div>
            <div className="mt-0.5 text-xs text-slate-500">{granted ? 'Granted — detected transactions will show up in Pending.' : 'Needed to read incoming bank/UPI SMS on this device.'}</div>
          </div>
        </div>
        {!granted && <button onClick={enable} disabled={busy} className="shrink-0 rounded-lg bg-accent-300/20 px-3 py-1.5 text-xs font-semibold text-accent-100 light:text-accent-700 hover:bg-accent-300/30 disabled:opacity-50">{busy ? 'Requesting…' : 'Enable'}</button>}
      </div>
      {granted && (
        <div className="flex items-center justify-between gap-4 rounded-xl bg-black/20 light:bg-black/[.06] px-4 py-3">
          <div className="flex items-center gap-3">
            <BatteryWarning size={16} className="shrink-0 text-amber-300" />
            <div>
              <div className="text-sm text-white light:text-slate-900">Battery optimization</div>
              <div className="mt-0.5 text-xs text-slate-500">Some phones (Xiaomi, Oppo, Vivo especially) kill background apps aggressively — exempting this app catches more messages.</div>
            </div>
          </div>
          <button onClick={openBatteryOptimizationSettings} className="shrink-0 rounded-lg border border-white/10 light:border-black/10 px-3 py-1.5 text-xs font-semibold text-slate-300 light:text-slate-700 hover:bg-white/5">Open settings</button>
        </div>
      )}
    </div>
  )
}

export function SettingsSmsAutoDetect({ data, onSaveProfile, toast }) {
  const { profile, sms_parse_patterns: patterns = [] } = data
  const activePatterns = patterns.filter((p) => p.is_active !== false)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-5">
        <div className="flex items-center gap-3 text-sm font-semibold text-white light:text-slate-900"><Smartphone size={16} className="text-slate-400 light:text-slate-500" />SMS auto-detect</div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Android only, via the native app — this browser tab can't read device SMS. Turn the
          "Pending" module on in Settings → Modules to enable it; detected bank/UPI transactions
          show up there for you to approve or reject.
        </p>
        <NativePermissionCard toast={toast} />
      </div>

      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-5">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-black/20 light:bg-black/[.06] px-4 py-3">
          <div>
            <div className="text-sm text-white light:text-slate-900">Auto-approve trusted senders</div>
            <div className="mt-0.5 text-xs text-slate-500">Skip the approval card for any sender that already matches a known pattern below — it's added straight to Transactions instead. Off by default; turn on only once you trust the detected amounts.</div>
          </div>
          <ToggleSwitch checked={!!profile?.sms_auto_approve_trusted} onChange={(v) => onSaveProfile({ sms_auto_approve_trusted: v })} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card">
        <div className="border-b border-white/10 light:border-black/10 px-5 py-3 text-xs uppercase tracking-widest text-slate-500">Recognized senders · {activePatterns.length}</div>
        {activePatterns.length === 0 ? (
          <div className="px-5 py-6 text-sm text-slate-500">No sender patterns configured yet.</div>
        ) : (
          <div className="divide-y divide-white/5 light:divide-black/5">
            {activePatterns.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[.05] light:bg-black/[.035] text-slate-400 light:text-slate-500"><Inbox size={14} /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-white light:text-slate-900">{p.bank_or_app}</div>
                  <div className="truncate text-[11px] text-slate-500">{p.sender_id_pattern}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="px-5 pb-4 text-[11px] text-slate-500">This list is managed by the app, not editable here — let us know if a bank or UPI app you use isn't detected correctly.</p>
      </div>
    </div>
  )
}
