import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'

export async function POST(request, { params }) {
  const { id } = await params
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response

  const { data: portfolio } = await supabase.from('portfolios').select('id').eq('id', id).eq('user_id', user.id).maybeSingle()
  if (!portfolio) return cors(NextResponse.json({ error: 'Portfolio not found' }, { status: 404 }))

  await supabase.from('portfolios').update({ kite_linked: false }).eq('id', id).eq('user_id', user.id)
  // Handing these back to manual bookkeeping — from here on the cash trigger charges their cost
  // against cash_balance like any other manually-entered holding.
  await supabase.from('holdings').update({ source: 'manual' }).eq('portfolio_id', id).eq('user_id', user.id).eq('source', 'kite')

  return cors(NextResponse.json({ ok: true }))
}
