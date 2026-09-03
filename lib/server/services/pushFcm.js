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

// Sends to every device this user has registered (lib/push/nativeBridge.js → device_tokens),
// pruning any token FCM reports as dead — a device that uninstalled the app or had its token
// rotated will never succeed again, same reasoning as push_subscriptions' 404/410 pruning.
export async function sendFcmToUser(supabase, userId, { title, body, url }) {
  const messaging = getMessagingClient()
  if (!messaging) return 0

  const { data: tokens } = await supabase.from('device_tokens').select('*').eq('user_id', userId)
  if (!tokens || tokens.length === 0) return 0

  let sent = 0
  const deadTokenIds = []
  for (const row of tokens) {
    try {
      await messaging.send({
        token: row.token,
        notification: { title, body },
        data: url ? { url } : undefined,
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
