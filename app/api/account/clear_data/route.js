import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { clearAllUserData } from '@/lib/server/services/accountData'

export async function POST(request) {
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  await clearAllUserData(supabase, user.id)
  return cors(NextResponse.json({ ok: true }))
}
