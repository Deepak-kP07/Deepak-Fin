import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { listVaultItems, createVaultItem } from '@/lib/server/services/vault'

export async function GET(request) {
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const rows = await listVaultItems(supabase, user)
  return cors(NextResponse.json(rows))
}

export async function POST(request) {
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const body = await request.json()
  const { created, error } = await createVaultItem(supabase, user, body)
  if (error) return cors(NextResponse.json({ error: error.message }, { status: 400 }))
  return cors(NextResponse.json(created))
}
