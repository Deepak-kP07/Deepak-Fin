'use client'

import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'

// Native FCM registration — the counterpart to Web Push (features/settings/SettingsNotifications.jsx's
// existing browser flow) for the Android app specifically, since a closed native app doesn't keep
// the WebView/service-worker context alive to receive a Web Push (see db/schema.js's comment on
// deviceTokens). Only ever meaningful on the native Android build; a no-op stub on web/PWA.
export function isNativePushAvailable() {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

// Resolves once a token is registered and saved server-side (device_tokens), or throws if
// permission was denied. Safe to call again on every login — POSTing the same token again just
// hits device_tokens' unique(user_id, token) constraint, which the caller should treat as success.
export function registerNativePush() {
  if (!isNativePushAvailable()) return Promise.resolve(false)
  return new Promise((resolve, reject) => {
    PushNotifications.requestPermissions().then(({ receive }) => {
      if (receive !== 'granted') { reject(new Error('Notification permission was denied')); return }

      const registrationHandle = PushNotifications.addListener('registration', async (token) => {
        registrationHandle.then((h) => h.remove())
        errorHandle.then((h) => h.remove())
        try {
          const response = await fetch('/api/finance/device_tokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token.value, platform: 'android' }),
          })
          // A 400 here is almost always the unique(user_id, token) constraint — this exact
          // token is already registered for this user, which is the same end state as success.
          resolve(response.ok || response.status === 400)
        } catch (err) {
          reject(err)
        }
      })
      const errorHandle = PushNotifications.addListener('registrationError', (err) => {
        registrationHandle.then((h) => h.remove())
        errorHandle.then((h) => h.remove())
        reject(new Error(err.error || 'Push registration failed'))
      })

      PushNotifications.register()
    }).catch(reject)
  })
}

// Foreground notifications still need a listener to actually show something (unlike a closed-app
// notification, which the OS renders on its own) — mirrors lib/sms/startSmsListener's shape.
// Returns an unsubscribe function.
export function startForegroundPushListener(onNotification) {
  if (!isNativePushAvailable()) return () => {}
  const handle = PushNotifications.addListener('pushNotificationReceived', (notification) => {
    onNotification?.(notification)
  })
  return () => { handle.then((h) => h.remove()) }
}
