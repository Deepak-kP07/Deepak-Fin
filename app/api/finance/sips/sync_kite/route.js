import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { syncMutualFundsFromKite } from '@/lib/server/services/kiteSync'

export async function POST(request) {
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const result = await syncMutualFundsFromKite(supabase, user.id)
  if (result.error) return cors(NextResponse.json({ error: result.error.message }, { status: result.error.status || 400 }))
  return cors(NextResponse.json(result))
}
