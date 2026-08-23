import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { saveBudgetMonth } from '@/lib/server/services/budgets'

export async function POST(request) {
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const body = await request.json()
  const result = await saveBudgetMonth(supabase, user.id, body)
  if (result.error) return cors(NextResponse.json({ error: result.error.message }, { status: result.error.status || 400 }))
  return cors(NextResponse.json(result))
}
