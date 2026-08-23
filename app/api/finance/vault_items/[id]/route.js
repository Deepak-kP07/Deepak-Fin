import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { getVaultItem, updateVaultItem, deleteVaultItem } from '@/lib/server/services/vault'

export async function GET(request, { params }) {
  const { id } = await params
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const row = await getVaultItem(supabase, user, id)
  return cors(NextResponse.json(row))
}

export async function PATCH(request, { params }) {
  const { id } = await params
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const body = await request.json()
  const { updated, error } = await updateVaultItem(supabase, user, id, body)
  if (error) return cors(NextResponse.json({ error: error.message }, { status: 400 }))
  return cors(NextResponse.json(updated))
}

export const PUT = PATCH

export async function DELETE(request, { params }) {
  const { id } = await params
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const result = await deleteVaultItem(supabase, user, id)
  return cors(NextResponse.json(result))
}
