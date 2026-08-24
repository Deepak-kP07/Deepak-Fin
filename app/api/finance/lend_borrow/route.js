import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { createInCollection } from '@/lib/server/genericCrud'
import { listLendBorrow } from '@/lib/server/lendBorrowCrud'

export async function GET(request) {
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const rows = await listLendBorrow(supabase, user)
  return cors(NextResponse.json(rows))
}

// Create stays on genericCrud.js unchanged — a new record is never a shared-with-me action, and
// its mirrored-transaction/card-outstanding side effect is unaffected by sharing.
export async function POST(request) {
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const body = await request.json()
  const { created, error } = await createInCollection(supabase, user, 'lend_borrow', body)
  if (error) return cors(NextResponse.json({ error: error.message }, { status: 400 }))
  return cors(NextResponse.json({ ...created, my_role: 'owner' }))
}
