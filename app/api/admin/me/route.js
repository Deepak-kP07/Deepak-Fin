import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/adminAuth'

export async function GET(request) {
  const { response } = requireAdmin(request)
  if (response) return response
  return NextResponse.json({ authenticated: true })
}
