// Pure aggregation for the weekly/monthly financial-report emails (see
// lib/server/services/reports.js and app/api/cron/reports/{weekly,monthly}/route.js). No
// 'use client' — same shape as lib/budgets.js/lib/creditCards.js, safe to import from a cron
// route (server-only) or, later, a client component.

import { liveOutstanding } from '@/lib/format'
import { planTotals } from '@/lib/budgets'
import { cardsDueSoon } from '@/lib/creditCards'
import { nextLoanDueDate } from '@/lib/amortization'

// Shifts the UTC epoch by +5:30 so this Date's own UTC getters (getUTCDay/Date/Month/FullYear)
// read as IST wall-clock fields — cheap, no ICU/timezone-db dependency, and exact for India
// specifically because it has one fixed UTC+5:30 offset with no DST. Only used for the period-
// boundary math and the cron's own "is today the scheduled day" gate — everything reused from
// elsewhere below (cardsDueSoon, nextLoanDueDate) keeps calling `new Date()` itself, unchanged,
// matching how the existing notifications cron (app/api/cron/notifications/route.js) already does.
export function istNow(ref = new Date()) {
  return new Date(ref.getTime() + 5.5 * 60 * 60 * 1000)
}
export function istDateStr(ref = new Date()) {
  return istNow(ref).toISOString().slice(0, 10)
}

function addDaysUTC(d, n) {
  const copy = new Date(d.getTime())
  copy.setUTCDate(copy.getUTCDate() + n)
  return copy
}
const ymdUTC = (d) => d.toISOString().slice(0, 10)

// The most recently COMPLETED Mon-Sun week as of `ref` (an IST-shifted Date from istNow()) — so
// a cron firing Monday morning resolves to *last* Mon-Sun, not the week that just started today.
export function weekBoundsIST(ref) {
  const dow = ref.getUTCDay() // 0=Sun..6=Sat
  const backToLastSunday = dow === 0 ? 7 : dow
  const end = addDaysUTC(ref, -backToLastSunday)
  const start = addDaysUTC(end, -6)
  const prevEnd = addDaysUTC(start, -1)
  const prevStart = addDaysUTC(prevEnd, -6)
  return { start: ymdUTC(start), end: ymdUTC(end), prevStart: ymdUTC(prevStart), prevEnd: ymdUTC(prevEnd) }
}

// The most recently completed calendar month as of `ref` — always the month before ref's own
// month, regardless of what day of the month `ref` is (the monthly cron only actually runs on
// the 1st, where this is unambiguous; a forced manual run on any other day still gets a sensible
// "last full month" answer rather than a half-open current month). year/month (0-indexed) match
// budget_months' own cursor fields exactly, so the budget section needs zero translation.
export function monthBoundsIST(ref) {
  const y = ref.getUTCFullYear(), m = ref.getUTCMonth()
  const prevMonth = m === 0 ? 11 : m - 1
  const prevYear = m === 0 ? y - 1 : y
  const start = new Date(Date.UTC(prevYear, prevMonth, 1))
  const end = new Date(Date.UTC(prevYear, prevMonth + 1, 0)) // day 0 of next month = last day of this one
  const twoBack = prevMonth === 0 ? 11 : prevMonth - 1
  const twoBackYear = prevMonth === 0 ? prevYear - 1 : prevYear
  const prevStart = new Date(Date.UTC(twoBackYear, twoBack, 1))
  const prevEnd = new Date(Date.UTC(twoBackYear, twoBack + 1, 0))
  return { start: ymdUTC(start), end: ymdUTC(end), prevStart: ymdUTC(prevStart), prevEnd: ymdUTC(prevEnd), year: prevYear, month: prevMonth }
}

function inRange(dateStr, start, end) { return dateStr >= start && dateStr <= end }

function incomeExpenseFor(transactions, start, end) {
  let income = 0, expense = 0
  for (const t of transactions) {
    if (t.type === 'transfer' || !inRange(t.date, start, end)) continue
    if (t.type === 'income') income += Number(t.amount || 0)
    else if (t.type === 'expense') expense += Number(t.amount || 0)
  }
  return { income, expense }
}

// Same signed convention the DB balance trigger (sync_account_balance, drizzle/0001_...sql) uses,
// run backwards — nets every transaction in [start,end] the way the trigger would, so subtracting
// it from the current balance reconstructs the balance as it stood right before the period began.
function accountsNetEffect(transactions, start, end) {
  let net = 0
  for (const t of transactions) {
    if (!inRange(t.date, start, end)) continue
    if (t.type === 'income') net += Number(t.amount || 0)
    else if (t.type === 'expense') net -= Number(t.amount || 0)
    else if (t.type === 'transfer' && t.transfer_direction === 'in') net += Number(t.amount || 0)
    else if (t.type === 'transfer' && t.transfer_direction === 'out') net -= Number(t.amount || 0)
  }
  return net
}

// Principal repaid during [start,end] — real payments only (adjustment rows are lender-sync
// corrections, not cash flows, same exclusion lib/format.js's liveOutstanding already applies).
// Outstanding at period start = outstanding now + principal repaid since then.
function principalRepaid(loanPayments, start, end) {
  let principal = 0
  for (const p of loanPayments) {
    if (p.type === 'adjustment' || !inRange(p.payment_date, start, end)) continue
    principal += Number(p.amount || 0) - Number(p.interest_portion || 0)
  }
  return principal
}

function topCategories(transactions, categories, start, end, limit = 5) {
  const byCategory = {}
  for (const t of transactions) {
    if (t.type !== 'expense' || !inRange(t.date, start, end)) continue
    const key = t.category_id || 'none'
    byCategory[key] = (byCategory[key] || 0) + Number(t.amount || 0)
  }
  return Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([categoryId, amount]) => ({ category: categories.find((c) => c.id === categoryId) || null, amount }))
}

// period: 'weekly' | 'monthly'. bounds: from weekBoundsIST()/monthBoundsIST(). Every array param
// is the raw rows for one user, exactly as fetched by lib/server/services/reports.js — same shape
// as what app/api/cron/notifications/route.js already fetches per user.
export function buildFinancialReport({
  period, bounds, accounts, transactions, loans, loanPayments, creditCards,
  holdings, portfolios, budgetMonths, categories,
}) {
  // Net worth "now" — ported verbatim from DashboardView's formula (app/page.js) so the number in
  // the email never disagrees with what the app itself shows.
  const totalBalance = accounts.reduce((s, a) => s + Number(a.current_balance || 0), 0)
  const holdingsValue = (holdings || []).reduce((s, h) => s + Number(h.qty) * Number(h.current_price || h.avg_buy_price), 0)
  const currentInv = holdingsValue + (portfolios || []).reduce((s, p) => s + Number(p.cash_balance || 0), 0)
  const activeLoans = loans.filter((l) => l.status !== 'closed')
  const totalOutstanding = activeLoans.reduce((s, l) => s + liveOutstanding(l, loanPayments.filter((p) => p.loan_id === l.id)), 0)
  const creditCardDebt = creditCards.reduce((s, c) => s + Number(c.current_outstanding || 0), 0)
  const netWorthNow = totalBalance + currentInv - totalOutstanding - creditCardDebt

  // The "change" figure only reconstructs what's cleanly reconstructable from existing ledgers —
  // credit-card outstanding and investment value are held constant between "now" and "period
  // start" deliberately, not an oversight: current_price on holdings is overwritten in place on
  // every sync with no history table, so historical portfolio value can't be reconstructed; and
  // netting credit_card_transactions against bill payments to reconstruct a past outstanding
  // risks a silently-wrong number in a channel nobody double-checks, for a liability that's
  // usually small and short-cycle relative to the rest of net worth.
  const accountsAtStart = totalBalance - accountsNetEffect(transactions, bounds.start, bounds.end)
  const outstandingAtStart = totalOutstanding + principalRepaid(loanPayments, bounds.start, bounds.end)
  const netWorthAtStart = accountsAtStart + currentInv - outstandingAtStart - creditCardDebt
  const netWorthChange = netWorthNow - netWorthAtStart

  const { income, expense } = incomeExpenseFor(transactions, bounds.start, bounds.end)
  const { income: prevIncome, expense: prevExpense } = incomeExpenseFor(transactions, bounds.prevStart, bounds.prevEnd)
  const net = income - expense
  const savingsRatePct = income > 0 ? Math.round((net / income) * 100) : 0

  // Monthly: the real plan for that completed month (open or already auto-closed) via the same
  // planTotals() the Budgets page itself uses — not budgetInsights(), which is hard-gated to "is
  // this literally the current month" and returns nothing for a month that's already over.
  // Weekly: there's no such thing as a weekly budget, so show pace against whichever monthly plan
  // is active *right now* instead (e.g. "62% of August's budget used, 12 days left") — a
  // deliberate asymmetry between the two report types, not an inconsistency.
  let budget = null
  if (period === 'monthly') {
    const plan = (budgetMonths || []).find((p) => p.year === bounds.year && p.month === bounds.month)
    if (plan) budget = planTotals(plan, transactions)
  } else {
    const activePlan = (budgetMonths || []).find((p) => p.status === 'active')
    if (activePlan) {
      const daysInMonth = new Date(activePlan.year, activePlan.month + 1, 0).getDate()
      const daysLeft = Math.max(0, daysInMonth - istNow().getUTCDate())
      budget = { ...planTotals(activePlan, transactions), daysLeft }
    }
  }

  const dueSoonDays = period === 'weekly' ? 7 : 30
  const upcomingCards = cardsDueSoon(creditCards, transactions, dueSoonDays)
  const now = new Date()
  const upcomingLoans = activeLoans
    .map((loan) => ({ loan, due: nextLoanDueDate(loan, now) }))
    .filter(({ due }) => due && Math.ceil((new Date(due) - now) / 86400000) <= dueSoonDays)

  return {
    period,
    range: { start: bounds.start, end: bounds.end },
    netWorth: { now: netWorthNow, change: netWorthChange },
    incomeExpense: { income, expense, net, savingsRatePct, prevIncome, prevExpense },
    budget,
    topCategories: topCategories(transactions, categories, bounds.start, bounds.end),
    upcoming: { cards: upcomingCards, loans: upcomingLoans },
  }
}
