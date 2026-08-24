import { NextResponse } from 'next/server'
import { getRouteClient } from '@/lib/supabase/server'
import { handleCORS } from '@/lib/server/cors'
import { previewInvite } from '@/lib/server/services/lendBorrowSharing'

// Public — no login required, same trust model as any emailed invite link.
export async function GET(request) {
  const { supabase, cookiesToSet } = getRouteClient(request)
  const cors = (response) => handleCORS(response, cookiesToSet)
  const token = new URL(request.url).searchParams.get('token')
  if (!token) return cors(NextResponse.json({ error: 'token is required' }, { status: 400 }))
  const result = await previewInvite(supabase, token)
  if (result.error) return cors(NextResponse.json({ error: result.error.message }, { status: result.error.status || 400 }))
  return cors(NextResponse.json(result.preview))
}
