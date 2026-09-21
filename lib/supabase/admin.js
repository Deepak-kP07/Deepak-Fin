import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service-role client — bypasses Row Level Security entirely.
// Server-only. Never import this from a client component; never send
// SUPABASE_SERVICE_ROLE_KEY to the browser. Reach for this only for
// operations that must act outside the current user's RLS scope — normal
// authenticated reads/writes should use getRouteClient() from ./server.js
// instead, so RLS stays the real enforcement mechanism.
// .trim() guards against a stray trailing newline/whitespace in how the env var was pasted into
// the hosting dashboard — that's invisible there, but supabase-js puts this value straight into
// an Authorization header, and a raw \n in a header value makes every request throw immediately
// (`Headers.append: ... is an invalid header value`) with no clue what's wrong from the outside.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
