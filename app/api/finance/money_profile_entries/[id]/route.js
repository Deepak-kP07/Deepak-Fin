import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { updateMoneyProfileEntry, deleteMoneyProfileEntry } from '@/lib/server/moneyProfileCrud'

export async function GET(request, { params }) {
  const { id } = await params
  const { supabase, cors, response } = await requireUser(request)
  if (response) return response
  const { data } = await supabase.from('money_profile_entries').select('*').eq('id', id).maybeSingle()
  return cors(NextResponse.json(data || null))
}

export async function PATCH(request, { params }) {
  const { id } = await params
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const body = await request.json()
  const result = await updateMoneyProfileEntry(supabase, user, id, body)
  if (result.error) return cors(NextResponse.json({ error: result.error.message }, { status: result.error.status || 400 }))
  return cors(NextResponse.json(result.updated))
}

export { PATCH as PUT }

export async function DELETE(request, { params }) {
  const { id } = await params
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const result = await deleteMoneyProfileEntry(supabase, user, id)
  if (result.error) return cors(NextResponse.json({ error: result.error.message }, { status: result.error.status || 400 }))
  return cors(NextResponse.json(result))
}
