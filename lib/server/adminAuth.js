import { timingSafeEqual, createHmac } from 'node:crypto'
import { NextResponse } from 'next/server'

// Fully standalone from the app's real auth (Supabase Auth / profiles / RLS) — this gates only
// the internal /admin surface. ADMIN_EMAIL/ADMIN_PASSWORD/ADMIN_SESSION_SECRET are env vars, never
// stored in the database.
export const ADMIN_COOKIE_NAME = 'pf_admin_session'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000
export const ADMIN_COOKIE_MAX_AGE = SESSION_TTL_MS / 1000

// timingSafeEqual throws on mismatched buffer lengths, so an early `return false` there would leak
// "your guess was the wrong length" via a faster response. Comparing the buffer against itself on
// a length mismatch keeps the response time shaped the same as a real comparison.
function constantTimeEqual(a, b) {
  const bufA = Buffer.from(String(a ?? ''))
  const bufB = Buffer.from(String(b ?? ''))
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA)
    return false
  }
  return timingSafeEqual(bufA, bufB)
}

export function checkAdminCredentials(email, password) {
  const expectedEmail = process.env.ADMIN_EMAIL
  const expectedPassword = process.env.ADMIN_PASSWORD
  if (!expectedEmail || !expectedPassword) return false
  const emailOk = constantTimeEqual(email, expectedEmail)
  const passwordOk = constantTimeEqual(password, expectedPassword)
  return emailOk && passwordOk
}

function sign(payload) {
  return createHmac('sha256', process.env.ADMIN_SESSION_SECRET || '').update(payload).digest('hex')
}

// Stateless — no session table. The token is just "expiry + HMAC of expiry", so verifying it needs
// only the shared secret, not a DB round trip. Throws if the secret isn't configured, rather than
// silently signing with an empty string — that would issue a cookie that looks valid at login time
// but fails every check right after, since verifyAdminSession refuses to run without the secret.
export function signAdminSession() {
  if (!process.env.ADMIN_SESSION_SECRET) throw new Error('ADMIN_SESSION_SECRET is not configured')
  const payload = String(Date.now() + SESSION_TTL_MS)
  return `${payload}.${sign(payload)}`
}

export function verifyAdminSession(token) {
  if (!token || typeof token !== 'string' || !process.env.ADMIN_SESSION_SECRET) return false
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return false
  if (!constantTimeEqual(sig, sign(payload))) return false
  const expiresAt = Number(payload)
  return Number.isFinite(expiresAt) && Date.now() < expiresAt
}

// Best-effort only — resets on every cold start and isn't shared across serverless instances, but
// still raises the bar over an unlimited-guess login on a publicly reachable route.
const attempts = new Map()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

export function clientIp(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

export function isRateLimited(ip) {
  const entry = attempts.get(ip)
  if (!entry || Date.now() > entry.resetAt) return false
  return entry.count >= MAX_ATTEMPTS
}

export function recordFailedAttempt(ip) {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now > entry.resetAt) attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  else entry.count += 1
}

export function clearAttempts(ip) {
  attempts.delete(ip)
}

// Mirrors lib/server/auth.js's requireUser(request) shape: {} on success, {response} — a
// ready-to-return 401 — on failure.
export function requireAdmin(request) {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value
  if (!verifyAdminSession(token)) {
    return { response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  }
  return {}
}
