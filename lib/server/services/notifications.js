import { sendPushToUser } from '@/lib/server/services/pushSend'
import { createAdminClient } from '@/lib/supabase/admin'
import { listAllUsers } from '@/lib/server/adminUsers'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || ''

// The single way to notify a user: writes the notification-center (bell) row, then sends a push
// only if that row is new. dedupKey makes repeat calls for the same reminder/event a no-op, so
// callers can run on every cron tick without piling up duplicates. `supabase` must be able to
// insert for `userId` — an admin client for crons or for notifying someone other than the caller.
export async function notifyUser(supabase, userId, { type, title, body = null, view = null, link = null, dedupKey = null, push = true }) {
  const row = { user_id: userId, type, title, body, view, link, dedup_key: dedupKey }
  const { data, error } = dedupKey
    ? await supabase.from('notifications').upsert(row, { onConflict: 'user_id,dedup_key', ignoreDuplicates: true }).select('id')
    : await supabase.from('notifications').insert(row).select('id')
  const created = !error && (data?.length || 0) > 0
  let pushed = 0
  if (created && push) {
    const path = link || (view ? `/?view=${view}` : '/')
    pushed = await sendPushToUser(supabase, userId, { title, body: body || '', url: `${BASE_URL}${path}` }).catch(() => 0)
  }
  return { created, pushed }
}

// Share invites/acceptances notify someone other than the signed-in caller, which needs the admin
// client (RLS only allows a user's own rows). Invites only know an email, so the invitee's account
// (if they have one yet) is found by email. Best-effort: callers .catch() and never fail on this.
export async function notifyShareInvite({ invitedEmail, acceptPath, title, body, dedupKey }) {
  const admin = createAdminClient()
  const email = String(invitedEmail || '').toLowerCase()
  const invitee = (await listAllUsers(admin)).find((u) => (u.email || '').toLowerCase() === email)
  if (!invitee) return { created: false }
  return notifyUser(admin, invitee.id, { type: 'share_invite', title, body, link: acceptPath, dedupKey })
}

export async function notifyShareAccepted({ ownerId, title, body, view, dedupKey }) {
  if (!ownerId) return { created: false }
  return notifyUser(createAdminClient(), ownerId, { type: 'share_accepted', title, body, view, dedupKey })
}

// Retention for the bell: read items older than 90 days and anything older than 180 days.
export async function pruneNotifications(supabase) {
  const days = (n) => new Date(Date.now() - n * 86400000).toISOString()
  await supabase.from('notifications').delete().not('read_at', 'is', null).lt('created_at', days(90))
  await supabase.from('notifications').delete().lt('created_at', days(180))
}
