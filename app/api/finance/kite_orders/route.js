import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { listCollection } from '@/lib/server/genericCrud'

// Read-only — kite_orders is a mirrored log populated exclusively by the Kite sync service
// (see syncKiteOrders in lib/server/services/kiteSync.js), never written to directly by a
// client, so this file only exports GET.
export async function GET(request) {
  const { supabase, user, cors, response } = await requireUser(request)
  if (response) return response
  const rows = await listCollection(supabase, user, 'kite_orders')
  return cors(NextResponse.json(rows))
}
