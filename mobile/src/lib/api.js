import { supabase } from './supabase'

// The native app uses the same /api routes as the web app. It has no cookies, so it sends the
// Supabase access token instead (see lib/supabase/server.js in the web project).
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://www.personalfin.site').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status }
}

export async function api(path, { method = 'GET', body } = {}) {
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
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(json?.error || json?.message || `Request failed (${res.status})`, res.status)
  return json
}
