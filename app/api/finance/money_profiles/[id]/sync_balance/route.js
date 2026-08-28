import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { syncMoneyProfileBalance } from '@/lib/server/services/moneyProfiles'

export async function POST(request, { params }) {
  const { id } = await params
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const body = await request.json()
  const result = await syncMoneyProfileBalance(supabase, user, id, body)
  if (result.error) return cors(NextResponse.json({ error: result.error.message }, { status: result.error.status || 400 }))
  return cors(NextResponse.json(result))
}
