import { NextResponse } from 'next/server'
import { getRouteClient } from '@/lib/supabase/server'
import { handleCORS } from '@/lib/server/cors'

export async function currentUser(supabase) {
  const { data } = await supabase.auth.getUser()
  return data?.user || null
}

// Shared session + auth guard for real per-resource route files. Returns
// {supabase, user, cors} on success; on failure it returns {response} — a ready-to-return
// 401 — so callers can early-return without repeating the check themselves:
//   const { supabase, user, cors, response } = await requireUser(request)
//   if (response) return response
export async function requireUser(request) {
  const { supabase, cookiesToSet } = getRouteClient(request)
  const cors = (response) => handleCORS(response, cookiesToSet)
  const user = await currentUser(supabase)
  if (!user) return { response: cors(NextResponse.json({ error: 'Not authenticated' }, { status: 401 })) }
  return { supabase, user, cors }
}
