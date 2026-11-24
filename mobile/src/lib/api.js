import { supabase } from './supabase'
import { loggedFeedback } from './feedback'

// The native app uses the same /api routes as the web app. It has no cookies, so it sends the
// Supabase access token instead (see lib/supabase/server.js in the web project).
// A release build always talks to the live site: .env.local's local-server URL is for dev builds
// only, and once baked into a release APK it made every request fail when that server was off.
const LIVE_URL = 'https://www.personalfin.site'
export const API_URL = (__DEV__ ? process.env.EXPO_PUBLIC_API_URL || LIVE_URL : LIVE_URL).replace(/\/$/, '')
// Pages people open in a browser (privacy policy, email links) always use the live site — the API
// URL above may point at a local dev server the browser can't reach.
export const WEB_URL = LIVE_URL

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status }
}

// No request should spin forever on a dead connection: every call gives up after `timeoutMs`
// (30s by default; screens that want a snappier answer pass less) with a clear message.
const DEFAULT_TIMEOUT_MS = 30000

// Creating one of these is "logging" something — a transaction, card spend, EMI, repayment, chit
// payment, Family/Company entry… — and gets the little done-chime + buzz (lib/feedback). Rate
// limited so a bulk import of 200 rows chimes once, not 200 times.
const LOGGED_ROUTE = /^\/finance\/(transactions|credit_card_transactions|loan_payments|lend_repayments|lend_borrow|money_profile_entries|scholarship_payments|scheduled_transactions)(\?|$)|^\/finance\/(credit_cards\/[^/]+\/pay_bill|chit_funds\/[^/]+\/(log_payment|take_payout)|lend_borrow\/[^/]+\/add_more)(\?|$)/
let lastLoggedAt = 0
function onLogged() {
  const now = Date.now()
  const quiet = now - lastLoggedAt < 2500
  lastLoggedAt = now
  if (!quiet) loggedFeedback()
}

export async function api(path, { method = 'GET', body, timeoutMs = DEFAULT_TIMEOUT_MS } = {}, retried = false) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let res
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch (e) {
    if (controller.signal.aborted) throw new ApiError('The server took too long to respond. Check your connection and try again.', 0)
    throw e
  } finally {
    clearTimeout(timer)
  }
  // A 401 right after sign-in or after the phone slept is usually a token that just expired or
  // wasn't stored yet — refresh the session once and retry before treating it as signed out.
  if (res.status === 401 && token && !retried) {
    const { data: refreshed } = await supabase.auth.refreshSession()
    if (refreshed.session) return api(path, { method, body, timeoutMs }, true)
  }
  const json = await res.json().catch(() => null)
  if (res.ok && method === 'POST' && LOGGED_ROUTE.test(path)) onLogged()
  if (!res.ok) throw new ApiError(json?.error || json?.message || `Request failed (${res.status})`, res.status)
  return json
}
