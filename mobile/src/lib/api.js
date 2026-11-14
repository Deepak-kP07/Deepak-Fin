import { supabase } from './supabase'

// The native app uses the same /api routes as the web app. It has no cookies, so it sends the
// Supabase access token instead (see lib/supabase/server.js in the web project).
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://www.personalfin.site').replace(/\/$/, '')
// Pages people open in a browser (privacy policy, email links) always use the live site — the API
// URL above may point at a local dev server the browser can't reach.
export const WEB_URL = 'https://www.personalfin.site'

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status }
}

export async function api(path, { method = 'GET', body } = {}, retried = false) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  // A 401 right after sign-in or after the phone slept is usually a token that just expired or
  // wasn't stored yet — refresh the session once and retry before treating it as signed out.
  if (res.status === 401 && token && !retried) {
    const { data: refreshed } = await supabase.auth.refreshSession()
    if (refreshed.session) return api(path, { method, body }, true)
  }
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(json?.error || json?.message || `Request failed (${res.status})`, res.status)
  return json
}
