import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'

// Same call the user's own self-serve "Resend confirmation email" button already makes
// (app/api/[[...path]]/route.js's /auth/resend_confirmation) — just triggered by admin, for a
// user who reached out unable to sign in.
export async function POST(request, { params }) {
  const { response } = requireAdmin(request)
  if (response) return response

  const { id } = await params

  try {
    const supabase = createAdminClient()
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(id)
    if (authError || !authUser?.user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (authUser.user.email_confirmed_at) return NextResponse.json({ error: 'This user is already confirmed' }, { status: 400 })

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: authUser.user.email,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/oauth_callback` },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: error.status || 400 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Could not resend confirmation email' }, { status: 500 })
  }
}
