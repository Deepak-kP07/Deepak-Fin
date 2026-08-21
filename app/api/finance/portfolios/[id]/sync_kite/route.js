import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { syncPortfolioFromKite } from '@/lib/server/services/kiteSync'

export async function POST(request, { params }) {
  const { id } = await params
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const result = await syncPortfolioFromKite(supabase, user.id, id)
  if (result.error) return cors(NextResponse.json({ error: result.error.message }, { status: result.error.status || 400 }))
  return cors(NextResponse.json(result))
}
