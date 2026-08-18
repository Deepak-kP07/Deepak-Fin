import { createBrowserClient } from '@supabase/ssr'

// Anon-key client for client components. RLS enforces per-user scoping.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
