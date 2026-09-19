import { NextResponse } from 'next/server'
import {
  ADMIN_COOKIE_NAME, ADMIN_COOKIE_MAX_AGE, checkAdminCredentials, signAdminSession,
  isRateLimited, recordFailedAttempt, clearAttempts, clientIp,
} from '@/lib/server/adminAuth'

export async function POST(request) {
  const ip = clientIp(request)
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many attempts — try again in a few minutes' }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  if (!checkAdminCredentials(body.email, body.password)) {
    recordFailedAttempt(ip)
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  clearAttempts(ip)

  const response = NextResponse.json({ ok: true })
  response.cookies.set(ADMIN_COOKIE_NAME, signAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_COOKIE_MAX_AGE,
  })
  return response
}
