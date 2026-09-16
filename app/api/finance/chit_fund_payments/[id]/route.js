import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { getOne } from '@/lib/server/genericCrud'
import { deleteChitFundPayment } from '@/lib/server/services/chitFunds'

export async function GET(request, { params }) {
  const { id } = await params
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const row = await getOne(supabase, user, 'chit_fund_payments', id)
  if (!row) return cors(NextResponse.json(null, { status: 404 }))
  return cors(NextResponse.json(row))
}

// No PATCH — a payment's amount/account/date directly drive an optional linked transaction, so
// changing it goes through editing that transaction (which reapplies via the linked_module hook
// in the transactions catch-all), not a raw PATCH of this row.
export async function DELETE(request, { params }) {
  const { id } = await params
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const result = await deleteChitFundPayment(supabase, user.id, id)
  if (result.error) return cors(NextResponse.json({ error: result.error.message }, { status: result.error.status || 400 }))
  return cors(NextResponse.json(result))
}
