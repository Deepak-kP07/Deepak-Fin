import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

// Session-scoped client for use inside Route Handlers. Uses the anon key, so
// every query is subject to the RLS policies defined on each table
// (auth.uid() = user_id) — this is the client almost everything should use.
//
// Two ways in:
//  - the web app: the Supabase session lives in cookies (@supabase/ssr).
//  - the native app (mobile/): there are no browser cookies, so it sends its Supabase access token
//    as `Authorization: Bearer <token>`. The client then sends that token with every query, so RLS
//    sees the same auth.uid() it would with cookies. getUser() is pinned to the token because a
//    header-only client has no stored session for it to read.
export function getRouteClient(request) {
  const cookiesToSet = []
  const bearer = bearerToken(request)
  if (bearer) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }
    )
    const getUser = supabase.auth.getUser.bind(supabase.auth)
    supabase.auth.getUser = (jwt) => getUser(jwt ?? bearer)
    return { supabase, cookiesToSet }
  }
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

function bearerToken(request) {
  const header = request.headers?.get?.('authorization') || ''
  if (!header.toLowerCase().startsWith('bearer ')) return null
  const token = header.slice(7).trim()
  return token || null
}

export function applyCookies(response, cookiesToSet = []) {
  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
  return response
}
