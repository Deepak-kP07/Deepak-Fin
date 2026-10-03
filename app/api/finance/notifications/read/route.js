import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'

// Body { ids: [...] } marks those as read; { all: true } marks every unread one.
export async function POST(request) {
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const body = await request.json().catch(() => ({}))
  const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === 'string').slice(0, 200) : []
  if (!body.all && ids.length === 0) return cors(NextResponse.json({ error: 'Pass ids or all: true' }, { status: 400 }))
  let q = supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null)
  if (!body.all) q = q.in('id', ids)
  const { error } = await q
  if (error) return cors(NextResponse.json({ error: error.message }, { status: 500 }))
  return cors(NextResponse.json({ ok: true }))
}
