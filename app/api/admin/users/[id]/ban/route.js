import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'

// '876000h' (100 years) is Supabase's own documented pattern for an effectively-permanent ban —
// there's no dedicated "banned forever" flag, ban_duration is always a duration off "now".
export async function POST(request, { params }) {
  const { response } = requireAdmin(request)
  if (response) return response

  const { id } = await params

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.auth.admin.updateUserById(id, { ban_duration: '876000h' })
    if (error) return NextResponse.json({ error: error.message }, { status: error.status || 400 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Could not disable this account' }, { status: 500 })
  }
}
