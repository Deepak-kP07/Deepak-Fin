import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { getOne, updateInCollection } from '@/lib/server/genericCrud'
import { deleteChitFund } from '@/lib/server/services/chitFunds'

export async function GET(request, { params }) {
  const { id } = await params
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const row = await getOne(supabase, user, 'chit_funds', id)
  if (!row) return cors(NextResponse.json(null, { status: 404 }))
  return cors(NextResponse.json(row))
}

export async function PATCH(request, { params }) {
  const { id } = await params
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const body = await request.json()
  const { updated, error } = await updateInCollection(supabase, user, 'chit_funds', id, body)
  if (error) return cors(NextResponse.json({ error: error.message }, { status: 400 }))
  return cors(NextResponse.json(updated))
}

export { PATCH as PUT }

// Custom, not makeItemRoutes' generic delete — a chit fund's payments and payout may each have
// their own linked transaction, which need cleaning up by hand before the row itself (and its
// cascade-deleted chit_fund_payments rows) can go, same reasoning as deleteLendBorrow.
export async function DELETE(request, { params }) {
  const { id } = await params
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const result = await deleteChitFund(supabase, user.id, id)
  if (result.error) return cors(NextResponse.json({ error: result.error.message }, { status: result.error.status || 400 }))
  return cors(NextResponse.json(result))
}
