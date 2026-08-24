import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { createOrRefreshInvite, listShares } from '@/lib/server/services/lendBorrowSharing'

// GET  /api/finance/lend_borrow_shares?lend_borrow_id=... — the "Manage access" list
// POST /api/finance/lend_borrow_shares  { lendBorrowId, invitedEmail, role } — create/refresh an invite

export async function GET(request) {
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const lendBorrowId = new URL(request.url).searchParams.get('lend_borrow_id')
  if (!lendBorrowId) return cors(NextResponse.json({ error: 'lend_borrow_id is required' }, { status: 400 }))
  const result = await listShares(supabase, user, lendBorrowId)
  if (result.error) return cors(NextResponse.json({ error: result.error.message }, { status: result.error.status || 400 }))
  return cors(NextResponse.json(result.shares))
}

export async function POST(request) {
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const body = await request.json()
  const result = await createOrRefreshInvite(supabase, user, body)
  if (result.error) return cors(NextResponse.json({ error: result.error.message }, { status: result.error.status || 400 }))
  return cors(NextResponse.json({ share: result.share, acceptUrl: result.acceptUrl }))
}
