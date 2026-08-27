import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { istNow } from '@/lib/reports'
import { runReportCron } from '@/lib/server/services/reports'
import { isValidCronSecret } from '@/lib/server/cronAuth'

// See app/api/cron/reports/weekly/route.js for why this is set explicitly.
export const maxDuration = 60

// Same auth as app/api/cron/notifications and the weekly report route — see that file's comment.
async function handler(request) {
  if (!isValidCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const force = url.searchParams.get('force') === '1'
  if (!force && istNow().getUTCDate() !== 1) {
    return NextResponse.json({ skipped: true, reason: 'not scheduled today (IST)' })
  }

  const supabase = createAdminClient()
  try {
    const result = await runReportCron(supabase, { period: 'monthly', force })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export const GET = handler
export const POST = handler
