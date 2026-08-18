import { createServerClient } from '@supabase/ssr'

// Session-scoped client for use inside Route Handlers. Uses the anon key, so
// every query is subject to the RLS policies defined on each table
// (auth.uid() = user_id) — this is the client almost everything should use.
export function getRouteClient(request) {
  const cookiesToSet = []
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(list) {
          cookiesToSet.push(...list)
        },
      },
    }
  )
  return { supabase, cookiesToSet }
}

export function applyCookies(response, cookiesToSet = []) {
  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
  return response
}
