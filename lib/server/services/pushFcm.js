import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

// FIREBASE_SERVICE_ACCOUNT_JSON holds the raw JSON contents of the service account key
// downloaded from Firebase Console → Project Settings → Service Accounts. Not set until the
// native app's Firebase project exists — every export here is a no-op until then, mirroring how
// app/api/cron/notifications/route.js already treats missing VAPID keys, so this can land ahead
// of that setup without breaking the existing Web Push path.
function getMessagingClient() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!json) return null
  if (getApps().length === 0) {
    initializeApp({ credential: cert(JSON.parse(json)) })
  }
  return getMessaging()
}

// Sent as `data` only, deliberately never `notification` — a `notification` payload gets
// auto-displayed by Play Services directly for a backgrounded/closed app, bypassing all app code,
// which is why the small status-bar icon can only ever be the forced monochrome silhouette
// (android/app/src/main/res/drawable-*dpi/ic_stat_notification.png) and there's no way to attach
// a real large icon. A data-only message always invokes PushMessagingService.onMessageReceived()
// (android/app/src/main/java/com/personalfin/app/push/PushMessagingService.kt), which builds the
// notification itself using the actual bundled app icon as the large icon.
export async function sendFcmToUser(supabase, userId, { title, body, url }) {
  const messaging = getMessagingClient()
  if (!messaging) return 0

  const { data: tokens } = await supabase.from('device_tokens').select('*').eq('user_id', userId)
  if (!tokens || tokens.length === 0) return 0

  let sent = 0
  const deadTokenIds = []
  for (const row of tokens) {
    try {
      // The native app (mobile/, platform 'android_app') has no custom messaging service, so it
      // gets a `notification` payload that Android shows by itself when the app is in the
      // background; `channelId` matches the channel the app creates (mobile/src/lib/push.js).
      // The old Capacitor wrapper ('android') keeps its data-only message.
      const isNativeApp = row.platform === 'android_app'
      await messaging.send({
        token: row.token,
        data: { title, body, ...(url ? { url } : {}) },
        ...(isNativeApp ? { notification: { title, body } } : {}),
        android: { priority: 'high', ...(isNativeApp ? { notification: { channelId: 'default' } } : {}) },
      })
      sent++
    } catch (err) {
      if (err.code === 'messaging/registration-token-not-registered' || err.code === 'messaging/invalid-registration-token') {
        deadTokenIds.push(row.id)
      }
    }
  }
  if (deadTokenIds.length) {
    await supabase.from('device_tokens').delete().in('id', deadTokenIds)
  }
  return sent
}
