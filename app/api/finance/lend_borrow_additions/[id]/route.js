import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'

// Deliberately notes-only, not a generic makeItemRoutes('lend_borrow_additions') — amount/date/
// account_id are set once at creation (applyLendAddition, see lend_borrow/[id]/add_more) and
// lend_borrow.amount/status derive from them with no reconciliation path for a later edit, so
// exposing those fields here would let them drift out of sync. The note is purely descriptive
// (it's just what LendBorrowDetailView shows as this top-up's title) and safe to change anytime.
export async function PATCH(request, { params }) {
  const { id } = await params
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const body = await request.json()
  const { data: updated, error } = await supabase
    .from('lend_borrow_additions')
    .update({ notes: body.notes || null })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .maybeSingle()
  if (error) return cors(NextResponse.json({ error: error.message }, { status: 400 }))
  if (!updated) return cors(NextResponse.json({ error: 'Not found' }, { status: 404 }))
  return cors(NextResponse.json(updated))
}
