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

// A backgrounded/closed app never runs any of this app's own code for a notification-payload
// message — Play Services auto-displays it directly from the payload fields, which is why the
// small status-bar icon can only ever be a monochrome silhouette (android/app/src/main/res/
// drawable-*dpi/ic_stat_notification.png — an OS-wide rule, not something any app can opt out
// of). imageUrl is the one field that auto-display renders in full color, as an expandable big
// picture, so it's the actual logo showing up rather than just the tinted silhouette.
// Hardcoded to the www host specifically, not NEXT_PUBLIC_BASE_URL (which is the bare domain) —
// that 308-redirects here, and this needs to be a direct 200 for FCM's own image fetch to render
// it reliably rather than depending on the fetcher following a redirect.
const LOGO_URL = 'https://www.personalfin.site/icons/icon-512.png'

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
        notification: { title, body, imageUrl: LOGO_URL },
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
