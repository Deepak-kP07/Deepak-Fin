import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { revealVaultItem } from '@/lib/server/services/vault'

// The only route that ever returns plaintext card/account secrets — called on demand when a
// vault card is flipped, never prefetched and never included in /finance/summary.
export async function POST(request, { params }) {
  const { id } = await params
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const secrets = await revealVaultItem(supabase, user, id)
  if (!secrets) return cors(NextResponse.json({ error: 'Not found' }, { status: 404 }))
  const res = NextResponse.json({ secrets })
  res.headers.set('Cache-Control', 'no-store')
  return cors(res)
}
