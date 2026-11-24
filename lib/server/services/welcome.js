import { createAdminClient } from '@/lib/supabase/admin'
import { sendWelcomeEmail } from '@/lib/email'

// How long after sign-up an account still counts as "new" for /auth/welcome. Older accounts never
// get a welcome from it, so existing users installing the native app aren't welcomed again.
const NEW_ACCOUNT_WINDOW_MS = 3 * 24 * 60 * 60 * 1000

// The welcome email, at most once per user. The send is recorded in app_metadata.welcome_sent_at
// (only the service role can write app_metadata, so a client can't clear it to get re-sent), which
// lets every sign-in path — web signup, web Google, email-confirm callback, native app — call this
// freely without double-sending. Best-effort: callers .catch() and never fail on it.
export async function sendWelcomeOnce(user, name) {
  if (!user?.id || !user.email) return false
  if (user.app_metadata?.welcome_sent_at) return false
  const admin = createAdminClient()
  const { data } = await admin.auth.admin.getUserById(user.id)
  const fresh = data?.user || user
  if (fresh.app_metadata?.welcome_sent_at) return false
  // Mark first so two near-simultaneous calls can't both send.
  const { error } = await admin.auth.admin.updateUserById(user.id, { app_metadata: { ...(fresh.app_metadata || {}), welcome_sent_at: new Date().toISOString() } })
  if (error) return false
  await sendWelcomeEmail({ to: fresh.email, name: name || fresh.user_metadata?.full_name })
  return true
}

// The native app's hook (POST /auth/welcome after any sign-in): it signs up and confirms email
// outside the web's callbacks, so it can't rely on those to welcome. Only new, confirmed accounts.
export async function welcomeIfNew(user) {
  if (!user?.created_at || (!user.email_confirmed_at && !user.confirmed_at)) return false
  if (Date.now() - new Date(user.created_at).getTime() > NEW_ACCOUNT_WINDOW_MS) return false
  return sendWelcomeOnce(user)
}
