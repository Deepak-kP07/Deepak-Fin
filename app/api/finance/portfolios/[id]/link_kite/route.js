import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { syncPortfolioFromKite } from '@/lib/server/services/kiteSync'

export async function POST(request, { params }) {
  const { id } = await params
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response

  const { data: portfolio } = await supabase.from('portfolios').select('*').eq('id', id).eq('user_id', user.id).maybeSingle()
  if (!portfolio) return cors(NextResponse.json({ error: 'Portfolio not found' }, { status: 404 }))

  const { count: holdingsCount } = await supabase.from('holdings').select('id', { count: 'exact', head: true }).eq('portfolio_id', id).eq('user_id', user.id)
  if (holdingsCount > 0) return cors(NextResponse.json({ error: 'Only an empty portfolio can be linked to Kite — Kite becomes the sole source for its holdings.' }, { status: 400 }))

  const { data: alreadyLinked } = await supabase.from('portfolios').select('id').eq('user_id', user.id).eq('kite_linked', true).maybeSingle()
  if (alreadyLinked && alreadyLinked.id !== id) return cors(NextResponse.json({ error: 'Another portfolio is already linked to Kite — unlink it first.' }, { status: 400 }))

  const { error: updateError } = await supabase.from('portfolios').update({ kite_linked: true }).eq('id', id).eq('user_id', user.id)
  // The unique partial index (portfolios_one_kite_linked_per_user) is the hard backstop against
  // a race between the check above and this write — surface it the same way as the friendly
  // pre-check if it somehow fires.
  if (updateError) return cors(NextResponse.json({ error: 'Another portfolio is already linked to Kite — unlink it first.' }, { status: 400 }))

  const result = await syncPortfolioFromKite(supabase, user.id, id)
  if (result.error) return cors(NextResponse.json({ error: result.error.message }, { status: result.error.status || 400 }))
  return cors(NextResponse.json(result))
}
