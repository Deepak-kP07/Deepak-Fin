import { MONTH_NAMES } from '@/lib/format'

export function monthLabel(year, month) {
  return `${MONTH_NAMES[month]} ${year}`
}

function inMonth(dateStr, year, month) {
  const d = new Date(dateStr)
  return d.getFullYear() === year && d.getMonth() === month
}

// Overall spend is every real expense that month, not just the ones under a budgeted category —
// "how much I actually spent" should mean all of it, matching what Dashboard's own month-expense
// figure already means.
export function monthTotalSpent(year, month, transactions) {
  return transactions.filter((t) => t.type === 'expense' && inMonth(t.date, year, month)).reduce((s, t) => s + Number(t.amount || 0), 0)
}

export function spentForCategory(categoryId, year, month, transactions) {
  return transactions.filter((t) => t.type === 'expense' && t.category_id === categoryId && inMonth(t.date, year, month)).reduce((s, t) => s + Number(t.amount || 0), 0)
}

export function planTotals(plan, transactions) {
  const budgeted = Number(plan?.total_amount || 0)
  const spent = plan ? monthTotalSpent(plan.year, plan.month, transactions) : 0
  const pct = budgeted > 0 ? Math.min(100, Math.round((spent / budgeted) * 100)) : 0
  return { budgeted, spent, remaining: budgeted - spent, pct }
}

export function categoryBreakdown(plan, lines, categories, transactions) {
  return lines.map((line) => {
    const category = categories.find((c) => c.id === line.category_id)
    const budgeted = Number(line.amount || 0)
    const spent = spentForCategory(line.category_id, plan.year, plan.month, transactions)
    const pct = budgeted > 0 ? Math.min(100, Math.round((spent / budgeted) * 100)) : 0
    return { line, category, budgeted, spent, pct }
  }).sort((a, b) => (b.spent / (b.budgeted || 1)) - (a.spent / (a.budgeted || 1)))
}

// Closed plans strictly before (year, month), most recent first — the "history" a streak or a
// month-over-month comparison looks back through.
function priorClosedPlans(budgetMonths, year, month) {
  return budgetMonths
    .filter((p) => p.status === 'closed' && (p.year < year || (p.year === year && p.month < month)))
    .sort((a, b) => (b.year - a.year) || (b.month - a.month))
}

// How many of the most recent CONSECUTIVE closed months (that also budgeted this category) went
// over budget, counting backward from the month right before `plan`. Stops at the first month
// that wasn't over, or that didn't budget this category at all — a real streak, not just a count
// of how many times it's happened.
export function overspendStreak(categoryId, plan, budgetMonths, budgetMonthCategories, transactions) {
  let streak = 0
  for (const p of priorClosedPlans(budgetMonths, plan.year, plan.month)) {
    const line = budgetMonthCategories.find((l) => l.budget_month_id === p.id && l.category_id === categoryId)
    if (!line || Number(line.amount) <= 0) break
    if (spentForCategory(categoryId, p.year, p.month, transactions) > Number(line.amount)) streak++
    else break
  }
  return streak
}

// The immediately preceding closed month's actual spend for this category, for a quick "vs last
// month" comparison — null if there is no prior closed month at all.
export function previousMonthSpend(categoryId, plan, budgetMonths, transactions) {
  const prior = priorClosedPlans(budgetMonths, plan.year, plan.month)[0]
  if (!prior) return null
  return { plan: prior, spent: spentForCategory(categoryId, prior.year, prior.month, transactions) }
}

// Per-category insights for the real current, still-open month — combines three signals:
//  - pace: a simple linear "at this rate, here's where you'll land by month end" projection,
//    skipped for the first ~15% of the month so one early purchase doesn't look alarming purely
//    because so little of the month has happened yet.
//  - streak: this category went over budget in each of the last N consecutive closed months.
//  - vsLastMonth: how this month's spend-so-far compares to last month's final total.
// A category surfaces here if it's currently trending over pace, OR has a 2+ month overspend
// streak (worth flagging even if this month currently looks fine) — sorted worst pace overrun
// first, streak as the tiebreaker.
export function budgetInsights(plan, lines, budgetMonths, budgetMonthCategories, categories, transactions) {
  if (!plan || plan.status !== 'active') return []
  const now = new Date()
  if (plan.year !== now.getFullYear() || plan.month !== now.getMonth()) return []
  const daysInMonth = new Date(plan.year, plan.month + 1, 0).getDate()
  const timeElapsedPct = now.getDate() / daysInMonth
  const paceReady = timeElapsedPct >= 0.15
  return categoryBreakdown(plan, lines, categories, transactions)
    .filter((b) => b.budgeted > 0)
    .map((b) => {
      const projected = paceReady && timeElapsedPct > 0 ? b.spent / timeElapsedPct : null
      const overPace = paceReady && projected > b.budgeted * 1.1
      const streak = overspendStreak(b.line.category_id, plan, budgetMonths, budgetMonthCategories, transactions)
      const vsLastMonth = previousMonthSpend(b.line.category_id, plan, budgetMonths, transactions)
      return { ...b, projected, overPace, streak, vsLastMonth }
    })
    .filter((b) => b.overPace || b.streak >= 2)
    .sort((a, b) => (b.streak - a.streak) || (((b.projected || 0) - b.budgeted) - ((a.projected || 0) - a.budgeted)))
}
