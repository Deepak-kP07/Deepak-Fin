import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { updateShare } from '@/lib/server/services/moneyProfileSharing'

// PATCH { role } — change a collaborator's tier (owner, or admin acting on a non-admin row)
// PATCH { status: 'revoked' } — revoke access (owner/admin, or the collaborator leaving on their own)

export async function PATCH(request, { params }) {
  const { id } = await params
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const body = await request.json()
  const result = await updateShare(supabase, user, id, body)
  if (result.error) return cors(NextResponse.json({ error: result.error.message }, { status: result.error.status || 400 }))
  return cors(NextResponse.json(result.share))
}
