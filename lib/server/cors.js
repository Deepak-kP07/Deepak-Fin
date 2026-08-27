import { applyCookies } from '@/lib/supabase/server'

export function handleCORS(response, cookiesToSet = []) {
  applyCookies(response, cookiesToSet)
  // '*' paired with Allow-Credentials: true below is a combination browsers reject outright for
  // credentialed requests, so a missing NEXT_PUBLIC_BASE_URL didn't silently open CORS up — it
  // just silently broke credentialed cross-origin calls instead. Falls back to the local dev
  // origin rather than a wildcard, so an unset env var fails loud in dev instead of quietly in prod.
  response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}
