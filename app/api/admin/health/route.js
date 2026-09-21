import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { listAllUsers } from '@/lib/server/adminUsers'

const DAY_MS = 24 * 60 * 60 * 1000

// Delivery health: among opted-in users, what fraction actually got a report in the expected
// window. lastXSentAt is cron-only-written (excluded from safeFields.js), so it's a trustworthy
// signal — a big gap here means the cron is broken, not that people are opting out.
export async function GET(request) {
  const { response } = requireAdmin(request)
  if (response) return response

  try {
    const supabase = createAdminClient()
    const [users, { data: profiles, error: profilesError }] = await Promise.all([
      listAllUsers(supabase),
      supabase.from('profiles').select('id, weekly_report_enabled, monthly_report_enabled, last_weekly_report_sent_at, last_monthly_report_sent_at, kite_last_error'),
    ])
    if (profilesError) throw new Error(profilesError.message)

    const emailById = new Map(users.map((u) => [u.id, u.email]))
    const now = Date.now()

    const weeklyOptedIn = (profiles || []).filter((p) => p.weekly_report_enabled)
    const weeklySent = weeklyOptedIn.filter((p) => p.last_weekly_report_sent_at && now - new Date(p.last_weekly_report_sent_at).getTime() <= 7 * DAY_MS)

    const monthlyOptedIn = (profiles || []).filter((p) => p.monthly_report_enabled)
    const monthlySent = monthlyOptedIn.filter((p) => p.last_monthly_report_sent_at && now - new Date(p.last_monthly_report_sent_at).getTime() <= 30 * DAY_MS)

    const kiteErrors = (profiles || [])
      .filter((p) => p.kite_last_error)
      .map((p) => ({ id: p.id, email: emailById.get(p.id) || 'Unknown', error: p.kite_last_error }))

    return NextResponse.json({
      weeklyReport: { optedIn: weeklyOptedIn.length, sentRecently: weeklySent.length },
      monthlyReport: { optedIn: monthlyOptedIn.length, sentRecently: monthlySent.length },
      kiteErrors,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Could not load health data' }, { status: 500 })
  }
}
