import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { createOrRefreshInvite, listShares } from '@/lib/server/services/moneyProfileSharing'

// GET  /api/finance/money_profile_shares?profile_id=... — the "Manage access" list
// POST /api/finance/money_profile_shares  { profileId, invitedEmail, role } — create/refresh an invite

export async function GET(request) {
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const profileId = new URL(request.url).searchParams.get('profile_id')
  if (!profileId) return cors(NextResponse.json({ error: 'profile_id is required' }, { status: 400 }))
  const result = await listShares(supabase, user, profileId)
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
