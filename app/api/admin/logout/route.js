import { NextResponse } from 'next/server'
import { ADMIN_COOKIE_NAME } from '@/lib/server/adminAuth'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(ADMIN_COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 })
  return response
}
