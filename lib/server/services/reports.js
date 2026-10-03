import { istNow, istDateStr, weekBoundsIST, monthBoundsIST, buildFinancialReport } from '@/lib/reports'
import { sendWeeklyReportEmail, sendMonthlyReportEmail } from '@/lib/email'
import { listAllUsers } from '@/lib/server/adminUsers'
import { notifyUser } from '@/lib/server/services/notifications'

// One user's worth of raw rows, fetched fresh per user (same pattern the notifications cron's
// checkUser() already uses) rather than one giant cross-user query — keeps this trivially correct
// under RLS-equivalent scoping even though createAdminClient() bypasses RLS, and keeps memory
// bounded regardless of user count.
async function fetchUserRows(supabase, userId) {
  const table = (name) => supabase.from(name).select('*').eq('user_id', userId)
  const [
    { data: accounts }, { data: transactions }, { data: loans }, { data: loanPayments },
    { data: creditCards }, { data: holdings }, { data: portfolios },
    { data: budgetMonths }, { data: categories },
  ] = await Promise.all([
    table('accounts'), table('transactions'), table('loans'), table('loan_payments'),
    table('credit_cards'), table('holdings'), table('portfolios'),
    table('budget_months'), table('categories'),
  ])
  return {
    accounts: accounts || [], transactions: transactions || [], loans: loans || [], loanPayments: loanPayments || [],
    creditCards: creditCards || [], holdings: holdings || [], portfolios: portfolios || [],
    budgetMonths: budgetMonths || [], categories: categories || [],
  }
}

// Shared by app/api/cron/reports/weekly/route.js and .../monthly/route.js — the "loop every user,
// check toggle+dedup, build the report, send, stamp" logic exists exactly once here, the same
// relationship generateDueRecurring() already has to the notifications cron.
export async function runReportCron(supabase, { period, force = false }) {
  const now = istNow()
  const todayIST = istDateStr()
  const enabledField = period === 'weekly' ? 'weekly_report_enabled' : 'monthly_report_enabled'
  const sentAtField = period === 'weekly' ? 'last_weekly_report_sent_at' : 'last_monthly_report_sent_at'
  const bounds = period === 'weekly' ? weekBoundsIST(now) : monthBoundsIST(now)

  const users = await listAllUsers(supabase)

  const results = []
  for (const user of users) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    if (!profile || profile[enabledField] === false) continue
    if (!user.email) continue
    if (!force && profile[sentAtField] && istDateStr(new Date(profile[sentAtField])) === todayIST) continue

    const rows = await fetchUserRows(supabase, user.id)
    const report = buildFinancialReport({ period, bounds, ...rows })
    try {
      const sender = period === 'weekly' ? sendWeeklyReportEmail : sendMonthlyReportEmail
      await sender({ to: user.email, name: profile.full_name, report })
      // Stamped only on a confirmed send, unlike the other Resend callers' fire-and-forget
      // `.catch(() => {})` convention — there, email failure must not block a real primary write;
      // here, sending IS the job, so swallowing the error and stamping "sent" anyway would
      // silently skip this user for the whole period on a transient Resend outage.
      await supabase.from('profiles').update({ [sentAtField]: new Date().toISOString() }).eq('id', user.id)
      // A bell entry so the report can be found from the app too — no push, the email is the alert.
      await notifyUser(supabase, user.id, {
        type: 'report_ready', title: `Your ${period} report is ready`, body: `Sent to ${user.email} — covers ${bounds.start} to ${bounds.end}.`,
        dedupKey: `report_ready:${period}:${bounds.start}`, push: false,
      }).catch(() => {})
      results.push({ userId: user.id, sent: true })
    } catch (err) {
      results.push({ userId: user.id, sent: false, error: err.message })
    }
  }
  return { period, range: bounds, usersChecked: users.length, results }
}
