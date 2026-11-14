import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { deleteUserAccount } from '@/lib/server/services/accountData'

// Permanently deletes the signed-in user's account and all of its data. The body must carry
// { confirm: 'DELETE' } — the client only sends that after the user types it — so a stray or
// replayed request without it can never remove an account.
export async function POST(request) {
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const body = await request.json().catch(() => ({}))
  if (body?.confirm !== 'DELETE') return cors(NextResponse.json({ error: 'Type DELETE to confirm' }, { status: 400 }))

  const { error } = await deleteUserAccount(supabase, user.id)
  if (error) {
    console.error('account delete failed for a user:', error.message)
    return cors(NextResponse.json({ error: 'Could not delete your account. Please try again, or email support.' }, { status: 500 }))
  }
  // The auth user is gone; this just clears the session cookies from the browser.
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
  return cors(NextResponse.json({ ok: true }))
}
