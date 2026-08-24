import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { listMoneyProfiles, createMoneyProfile } from '@/lib/server/moneyProfileCrud'

export async function GET(request) {
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const rows = await listMoneyProfiles(supabase, user)
  return cors(NextResponse.json(rows))
}

export async function POST(request) {
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const body = await request.json()
  const result = await createMoneyProfile(supabase, user, body)
  if (result.error) return cors(NextResponse.json({ error: result.error.message }, { status: result.error.status || 400 }))
  return cors(NextResponse.json(result.created))
}
