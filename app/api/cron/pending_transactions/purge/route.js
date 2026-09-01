import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidCronSecret } from '@/lib/server/cronAuth'

// raw_message is already cleared the moment a pending transaction is approved or rejected
// (see lib/server/services/pendingTransactions.js) — this is only the backstop for anything
// still sitting unresolved after 7 days, matching the PRD's "purge after ~7 days or on
// resolution, whichever first" retention window. Runs across all users via the service-role
// client, same as the other cron routes (app/api/cron/notifications).
export async function POST(request) {
  if (!isValidCronSecret(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase.from('pending_transactions')
    .update({ raw_message: null })
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .not('raw_message', 'is', null)
    .select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ purged: data?.length || 0 })
}
