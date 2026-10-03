import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'

// The bell's list: latest 50 plus the total unread count (which can exceed what's listed).
export async function GET(request) {
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const [{ data: items, error }, { count }] = await Promise.all([
    supabase.from('notifications').select('id, type, title, body, view, link, read_at, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('read_at', null),
  ])
  if (error) return cors(NextResponse.json({ error: error.message }, { status: 500 }))
  const res = NextResponse.json({ items: items || [], unread: count || 0 })
  res.headers.set('Cache-Control', 'no-store')
  return cors(res)
}
