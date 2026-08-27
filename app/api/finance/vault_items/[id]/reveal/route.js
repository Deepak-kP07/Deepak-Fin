import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { revealVaultItem } from '@/lib/server/services/vault'

// The only route that ever returns plaintext card/account secrets — never included in
// /finance/summary. Two modes: the default full reveal (card/account number, PIN/CVV/expiry/
// IFSC/branch/notes, everything) only ever runs from an explicit "Tap to reveal" or the edit
// form. ?preview=1 is the one exception that IS prefetched (on every vault card mount) — but it
// still decrypts everything server-side only to strip the response down to just the holder name,
// so the front face can show whose card/account it is without a tap while the number itself
// stays masked to last4 until the real reveal.
export async function POST(request, { params }) {
  const { id } = await params
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const secrets = await revealVaultItem(supabase, user, id)
  if (!secrets) return cors(NextResponse.json({ error: 'Not found' }, { status: 404 }))
  const preview = new URL(request.url).searchParams.get('preview') === '1'
  const body = preview
    ? { secrets: { holder_name: secrets.holder_name } }
    : { secrets }
  const res = NextResponse.json(body)
  res.headers.set('Cache-Control', 'no-store')
  return cors(res)
}
