import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { listAllUsers, countsByUser } from '@/lib/server/adminUsers'

// Full list, every field the directory table needs — search/sort/pagination happens client-side.
// Simplest correct thing at this project's user count; revisit only once that stops being cheap.
export async function GET(request) {
  const { response } = requireAdmin(request)
  if (response) return response

  try {
    const supabase = createAdminClient()
    const [users, txCounts] = await Promise.all([
      listAllUsers(supabase),
      countsByUser(supabase, 'transactions'),
    ])

    const rows = users.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      confirmed: !!u.email_confirmed_at,
      last_sign_in_at: u.last_sign_in_at || null,
      banned: !!(u.banned_until && new Date(u.banned_until).getTime() > Date.now()),
      transactionCount: txCounts.get(u.id) || 0,
    }))

    return NextResponse.json({ users: rows })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Could not load users' }, { status: 500 })
  }
}
