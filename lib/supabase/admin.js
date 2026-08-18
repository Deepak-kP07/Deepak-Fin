import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service-role client — bypasses Row Level Security entirely.
// Server-only. Never import this from a client component; never send
// SUPABASE_SERVICE_ROLE_KEY to the browser. Reach for this only for
// operations that must act outside the current user's RLS scope — normal
// authenticated reads/writes should use getRouteClient() from ./server.js
// instead, so RLS stays the real enforcement mechanism.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
