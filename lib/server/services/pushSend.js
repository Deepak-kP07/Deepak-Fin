import webpush from 'web-push'
import { sendFcmToUser } from '@/lib/server/services/pushFcm'

// Shared by the daily digest cron (app/api/cron/notifications/route.js) and anything that needs
// to notify immediately outside that cycle (e.g. genericCrud.js's pending_transactions ingestion)
// — extracted here so both call one implementation instead of drifting apart.
const VAPID_ENABLED = !!(process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
if (VAPID_ENABLED) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

// Sends to every channel this user has (Web Push subscriptions + FCM device tokens), pruning
// dead endpoints/tokens along the way. Returns how many actually succeeded.
export async function sendPushToUser(supabase, userId, { title, body, url }) {
  let sent = 0
  if (VAPID_ENABLED) {
    const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', userId)
    for (const sub of subs || []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, url })
        )
        sent++
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }
  }
  sent += await sendFcmToUser(supabase, userId, { title, body, url })
  return sent
}
