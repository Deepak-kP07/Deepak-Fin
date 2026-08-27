import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { revealVaultItem } from '@/lib/server/services/vault'

// The only route that ever returns plaintext card/account secrets — never included in
// /finance/summary. Two modes: the default full reveal (PIN/CVV/expiry/IFSC/branch/notes
// included) only ever runs from an explicit "Tap to reveal" or the edit form, same as always.
// ?preview=1 is the one exception that IS prefetched (on every vault card mount, to show the
// number and holder name on the front without a tap) — it still decrypts everything server-side
// but strips the response down to just the front-facing fields first, so PIN/CVV never reach the
// client outside the manual-reveal path.
export async function POST(request, { params }) {
  const { id } = await params
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const secrets = await revealVaultItem(supabase, user, id)
  if (!secrets) return cors(NextResponse.json({ error: 'Not found' }, { status: 404 }))
  const preview = new URL(request.url).searchParams.get('preview') === '1'
  const body = preview
    ? { secrets: { card_number: secrets.card_number, account_number: secrets.account_number, holder_name: secrets.holder_name } }
    : { secrets }
  const res = NextResponse.json(body)
  res.headers.set('Cache-Control', 'no-store')
  return cors(res)
}
