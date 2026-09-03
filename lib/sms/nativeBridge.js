'use client'

import { registerPlugin, Capacitor } from '@capacitor/core'
import { parseSms } from '@/lib/sms/parseEngine'

// Thin wrapper around the native Kotlin plugin (android/app/src/main/java/com/personalfin/app/sms)
// — registerPlugin resolves to a no-op stub automatically on a plain web/PWA tab (Capacitor's own
// behavior), so every function here is always safe to call; isNativeSmsAvailable() is what
// actually gates whether SMS detection can do anything on this device.
const SmsListener = registerPlugin('SmsListener')

export function isNativeSmsAvailable() {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

export async function checkSmsPermission() {
  if (!isNativeSmsAvailable()) return false
  const { granted } = await SmsListener.checkSmsPermission()
  return granted
}

export async function requestSmsPermission() {
  if (!isNativeSmsAvailable()) return false
  const { granted } = await SmsListener.requestSmsPermission()
  return granted
}

export function openBatteryOptimizationSettings() {
  if (!isNativeSmsAvailable()) return
  return SmsListener.openBatteryOptimizationSettings()
}

// Starts listening for native SMS_RECEIVED events and wires each one through parseSms() + an
// authenticated POST to /api/finance/pending_transactions — that fetch runs here, in the
// WebView's own JS, specifically because only this context carries the WebView's session
// cookies (see SmsReceiver.kt's comment; a Kotlin/OkHttp call would 401). `getPatterns` is a
// function, not a static array, so this always parses against whatever the app's most recent
// /finance/summary load returned rather than needing its own fetch. Returns an unsubscribe
// function — call it on unmount.
export function startSmsListener(getPatterns, onIngested) {
  if (!isNativeSmsAvailable()) return () => {}
  console.log('[PersonalFin-SMS] startSmsListener registering addListener')
  const listenerPromise = SmsListener.addListener('smsReceived', async ({ sender, body }) => {
    console.log('[PersonalFin-SMS] JS received smsReceived event, sender=' + sender)
    const parsed = parseSms(getPatterns(), { sender, body })
    console.log('[PersonalFin-SMS] parseSms result: ' + JSON.stringify(parsed))
    if (!parsed) return
    try {
      const response = await fetch('/api/finance/pending_transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...parsed, raw_message: body }),
      })
      console.log('[PersonalFin-SMS] POST /pending_transactions status=' + response.status)
      if (response.ok) onIngested?.()
    } catch (err) {
      // Best-effort — offline or a server hiccup just means this one SMS never became a pending
      // row; nothing else in the app depends on this particular call succeeding synchronously.
      console.log('[PersonalFin-SMS] POST failed: ' + err)
    }
  })
  return () => { listenerPromise.then((handle) => handle.remove()) }
}
