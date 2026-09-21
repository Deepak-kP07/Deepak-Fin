import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request, { params }) {
  const { response } = requireAdmin(request)
  if (response) return response

  const { id } = await params

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.auth.admin.updateUserById(id, { ban_duration: 'none' })
    if (error) return NextResponse.json({ error: error.message }, { status: error.status || 400 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Could not re-enable this account' }, { status: 500 })
  }
}
