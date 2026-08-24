import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { respondToInvite } from '@/lib/server/services/moneyProfileSharing'

// POST { token, action: 'accept' | 'decline' } — requires the caller to be logged in as the
// exact invited email (checked against the preview, not just RLS, so a mismatch gets a clear
// message instead of a silent no-op).
export async function POST(request) {
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const { token, action } = await request.json()
  if (!token) return cors(NextResponse.json({ error: 'token is required' }, { status: 400 }))
  const result = await respondToInvite(supabase, user, token, action || 'accept')
  if (result.error) return cors(NextResponse.json({ error: result.error.message }, { status: result.error.status || 400 }))
  return cors(NextResponse.json(result.share))
}
