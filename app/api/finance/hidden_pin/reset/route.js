import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { resetHiddenPin } from '@/lib/server/services/hiddenPin'

export async function POST(request) {
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const body = await request.json().catch(() => ({}))
  const result = await resetHiddenPin(supabase, user, body)
  const res = result.error
    ? NextResponse.json({ error: result.error.message }, { status: result.error.status || 500 })
    : NextResponse.json({ ok: true })
  res.headers.set('Cache-Control', 'no-store')
  return cors(res)
}
