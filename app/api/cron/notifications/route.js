import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cardsDueSoon } from '@/lib/creditCards'
import { budgetInsights } from '@/lib/budgets'
import { nextLoanDueDate } from '@/lib/amortization'
import { generateDueRecurring } from '@/lib/server/services/recurring'
import { generateDueRecurringMoneyProfileEntries } from '@/lib/server/services/recurringMoneyProfileEntries'
import { sendPushToUser } from '@/lib/server/services/pushSend'
import { money } from '@/lib/format'
import { isValidCronSecret } from '@/lib/server/cronAuth'

const DUE_SOON_DAYS = 4
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

// One dedup row per (user, type, entity, period) — checked before sending, written after. A row
// already existing for this exact key means this exact cycle already notified; a fresh cycle
// (a new due date, next month's budget plan, etc.) is a different key and notifies again on its
// own, with no time-window heuristic needed.
async function alreadyNotified(supabase, userId, type, entityId, periodKey) {
  const { data } = await supabase.from('notification_events').select('id').eq('user_id', userId).eq('type', type).eq('entity_id', entityId).eq('period_key', periodKey).maybeSingle()
  return !!data
}
async function recordNotified(supabase, userId, type, entityId, periodKey) {
  await supabase.from('notification_events').insert({ user_id: userId, type, entity_id: entityId, period_key: periodKey }).select().maybeSingle()
}

async function checkUser(supabase, userId) {
  const notifications = []

  // Recurring transactions generated — the cron run itself is the reliable trigger now, not
  // just "whenever the user happens to open the app."
  const generated = await generateDueRecurring(supabase, userId)
  for (const rule of generated) {
    const periodKey = rule.lastGenerated
    if (await alreadyNotified(supabase, userId, 'recurring_generated', rule.ruleId, periodKey)) continue
    notifications.push({
      type: 'recurring_generated', entityId: rule.ruleId, periodKey,
      title: 'Recurring transaction added', body: `${rule.description} — ${rule.count} occurrence${rule.count === 1 ? '' : 's'} generated`, url: '/?view=transactions',
    })
  }

  // Same idea, for Family/Company (Money Profile) recurring entries — previously only generated
  // lazily on next summary fetch, with nothing telling the user it happened.
  const generatedMoneyProfile = await generateDueRecurringMoneyProfileEntries(supabase, userId)
  for (const rule of generatedMoneyProfile) {
    const periodKey = rule.lastGenerated
    if (await alreadyNotified(supabase, userId, 'recurring_money_profile_generated', rule.ruleId, periodKey)) continue
    notifications.push({
      type: 'recurring_money_profile_generated', entityId: rule.ruleId, periodKey,
      title: 'Recurring entry added', body: `${rule.description} — ${rule.count} occurrence${rule.count === 1 ? '' : 's'} generated`, url: '/?view=family_company',
    })
  }

  // Pending transactions (SMS auto-detect) waiting for review — a digest, not one notification
  // per row, and capped at once a day per user via periodKey=today regardless of how many are
  // pending or how many cron runs happen today. The instant per-detection push
  // (lib/server/genericCrud.js's pending_transactions ingestion) is the primary signal; this is
  // just a catch-up for anything still sitting unreviewed.
  const { data: pending } = await supabase.from('pending_transactions').select('id').eq('user_id', userId).eq('status', 'pending')
  if (pending && pending.length > 0) {
    const periodKey = new Date().toISOString().slice(0, 10)
    if (!(await alreadyNotified(supabase, userId, 'pending_review_digest', userId, periodKey))) {
      notifications.push({
        type: 'pending_review_digest', entityId: userId, periodKey,
        title: 'Transactions waiting for review', body: `${pending.length} detected transaction${pending.length === 1 ? '' : 's'} need${pending.length === 1 ? 's' : ''} your approval`, url: '/?view=pending',
      })
    }
  }

  // Credit card bills due soon.
  const [{ data: creditCards }, { data: transactions }] = await Promise.all([
    supabase.from('credit_cards').select('*').eq('user_id', userId),
    supabase.from('transactions').select('*').eq('user_id', userId),
  ])
  for (const { card, due } of cardsDueSoon(creditCards || [], transactions || [], DUE_SOON_DAYS)) {
    const periodKey = due.toISOString().slice(0, 10)
    if (await alreadyNotified(supabase, userId, 'card_due', card.id, periodKey)) continue
    notifications.push({
      type: 'card_due', entityId: card.id, periodKey,
      title: `${card.name} bill due soon`, body: `Due ${periodKey} — outstanding ${money(card.current_outstanding)}`, url: '/?view=credit_cards',
    })
  }

  // Loan EMIs due soon.
  const { data: loans } = await supabase.from('loans').select('*').eq('user_id', userId).eq('status', 'active')
  const now = new Date()
  for (const loan of loans || []) {
    const due = nextLoanDueDate(loan, now)
    if (!due) continue
    const days = Math.ceil((new Date(due) - now) / 86400000)
    if (days > DUE_SOON_DAYS) continue
    if (await alreadyNotified(supabase, userId, 'loan_due', loan.id, due)) continue
    notifications.push({
      type: 'loan_due', entityId: loan.id, periodKey: due,
      title: `${loan.name} EMI due soon`, body: `Due ${due} — ${money(loan.emi_amount)}`, url: '/?view=loans',
    })
  }

  // Budget overspend — reuses the exact same insight function the dashboard renders from.
  const [{ data: budgetMonths }, { data: budgetMonthCategories }, { data: categories }] = await Promise.all([
    supabase.from('budget_months').select('*').eq('user_id', userId),
    supabase.from('budget_month_categories').select('*').eq('user_id', userId),
    supabase.from('categories').select('*').eq('user_id', userId),
  ])
  const activePlan = (budgetMonths || []).find((p) => p.status === 'active')
  if (activePlan) {
    const lines = (budgetMonthCategories || []).filter((l) => l.budget_month_id === activePlan.id)
    const insights = budgetInsights(activePlan, lines, budgetMonths || [], budgetMonthCategories || [], categories || [], transactions || [])
    const periodKey = `${activePlan.year}-${activePlan.month}`
    for (const insight of insights) {
      if (await alreadyNotified(supabase, userId, 'budget_overspend', insight.line.id, periodKey)) continue
      notifications.push({
        type: 'budget_overspend', entityId: insight.line.id, periodKey,
        title: `${insight.category?.name || 'A category'} is over budget`, body: `Spent ${money(insight.spent)} of ${money(insight.budgeted)} this month`, url: '/?view=budgets',
      })
    }
  }

  return notifications
}

// Vercel Cron hits this with GET and (once CRON_SECRET is set as a Vercel env var) automatically
// adds `Authorization: Bearer <CRON_SECRET>` itself — the x-cron-secret header is the manual-
// testing path (curl, before this is deployed anywhere). Either is accepted.
async function handler(request) {
  if (!isValidCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: usersPage, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 })

  const results = []
  for (const user of usersPage.users) {
    const notifications = await checkUser(supabase, user.id)
    let sent = 0
    for (const n of notifications) {
      const count = await sendPushToUser(supabase, user.id, { title: n.title, body: n.body, url: `${BASE_URL}${n.url}` })
      if (count > 0) { sent += count; await recordNotified(supabase, user.id, n.type, n.entityId, n.periodKey) }
    }
    if (notifications.length > 0) results.push({ userId: user.id, triggered: notifications.length, sent })
  }

  return NextResponse.json({ usersChecked: usersPage.users.length, results })
}

export const GET = handler
export const POST = handler
