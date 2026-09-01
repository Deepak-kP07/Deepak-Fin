import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { approvePendingTransaction } from '@/lib/server/services/pendingTransactions'

// Mirrors app/api/finance/budget_months/[id]/close/route.js's shape — a state-transition action
// route, not plain CRUD. `overrides` carries any last-second inline edits the approval card made
// that weren't already PATCHed to the pending row.
export async function POST(request, { params }) {
  const { id } = await params
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const overrides = await request.json().catch(() => ({}))
  const result = await approvePendingTransaction(supabase, user.id, id, overrides)
  if (result.error) return cors(NextResponse.json({ error: result.error.message }, { status: result.error.status || 400 }))
  return cors(NextResponse.json(result))
}
