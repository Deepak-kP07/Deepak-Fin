import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { getOne } from '@/lib/server/genericCrud'
import { deleteChitFundPayment, updateChitFundPayment } from '@/lib/server/services/chitFunds'

export async function GET(request, { params }) {
  const { id } = await params
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const row = await getOne(supabase, user, 'chit_fund_payments', id)
  if (!row) return cors(NextResponse.json(null, { status: 404 }))
  return cors(NextResponse.json(row))
}

// Amount/dividend/date/notes only — never account_id (see updateChitFundPayment's own comment).
export async function PATCH(request, { params }) {
  const { id } = await params
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const body = await request.json()
  const result = await updateChitFundPayment(supabase, user.id, id, body)
  if (result.error) return cors(NextResponse.json({ error: result.error.message }, { status: result.error.status || 400 }))
  return cors(NextResponse.json(result))
}

export { PATCH as PUT }

export async function DELETE(request, { params }) {
  const { id } = await params
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const result = await deleteChitFundPayment(supabase, user.id, id)
  if (result.error) return cors(NextResponse.json({ error: result.error.message }, { status: result.error.status || 400 }))
  return cors(NextResponse.json(result))
}
