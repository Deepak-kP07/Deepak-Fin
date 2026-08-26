import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { istNow } from '@/lib/reports'
import { runReportCron } from '@/lib/server/services/reports'

// Meaningfully more per-user work than the lightweight notifications cron (multiple table fetches
// + report math + a synchronous Resend call per user, all in one request) — no other route in
// this codebase sets this, so it's worth explicit headroom above Vercel's low default.
export const maxDuration = 60

// Same Authorization: Bearer <CRON_SECRET> / x-cron-secret auth as app/api/cron/notifications —
// Vercel Cron adds the Authorization header automatically once CRON_SECRET is set as a Vercel env
// var; x-cron-secret is the manual-curl testing path.
async function handler(request) {
  const auth = request.headers.get('authorization')
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  const secret = request.headers.get('x-cron-secret') || bearer
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const force = url.searchParams.get('force') === '1'
  // Defensive even though the vercel.json schedule already only fires this on Mondays — this
  // route is also what a human curls directly to test, and Vercel Cron retries/duplicate-fires
  // are a real (if rare) occurrence. force=1 bypasses this for manual/preview testing.
  if (!force && istNow().getUTCDay() !== 1) {
    return NextResponse.json({ skipped: true, reason: 'not scheduled today (IST)' })
  }

  const supabase = createAdminClient()
  try {
    const result = await runReportCron(supabase, { period: 'weekly', force })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export const GET = handler
export const POST = handler
