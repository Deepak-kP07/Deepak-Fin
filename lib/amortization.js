// Reducing-balance loan amortization math, shared between the client (live previews)
// and the server (what actually gets committed) so the two can never drift apart.

// The fixed EMI figure a lender quotes upfront — this is inherently a nominal, monthly-rate
// formula (that's the definition of an "equated MONTHLY installment"). How that fixed payment
// actually splits into interest/principal each period is a separate, date-aware question
// (see projectSchedule / daysBetween below) — real lenders accrue interest daily, not monthly.
export function calcEmi(principal, annualRatePct, months) {
  const r = annualRatePct / 12 / 100
  const n = Math.max(1, Math.round(months))
  if (principal <= 0 || n <= 0) return 0
  if (r === 0) return principal / n
  const factor = Math.pow(1 + r, n)
  return (principal * r * factor) / (factor - 1)
}

export function daysBetween(dateA, dateB) {
  return Math.round((new Date(dateB) - new Date(dateA)) / 86400000)
}

// Actual/365 daily accrual — interest = balance × (annualRate/100/365) × real elapsed days.
// This is how real NBFC loans charge interest (confirmed against a live Navi Finserv/Tata
// Capital loan agreement's own repayment schedule, matched to the rupee across several
// months of differing length), not a flat balance × annualRate/12/100 approximation.
export function accrueInterest(outstanding, annualRatePct, days) {
  return Number(outstanding) * (annualRatePct / 100 / 365) * days
}

// Walks the loan forward one calendar month at a time from startDate (same day-of-month each
// cycle — the natural EMI due-date pattern), accruing interest on the real day-count of each
// step (28-31 days, not a flat 1/12) until the balance is paid off (or the EMI can't even
// cover the interest, or the safety cap is hit — both guard against an infinite loop).
export function projectSchedule({ outstanding, annualRatePct, emiAmount, startDate, maxMonths = 600 }) {
  let balance = Number(outstanding)
  let cursor = new Date(startDate)
  const schedule = []
  let month = 1
  while (balance > 0.5 && month <= maxMonths) {
    const next = new Date(cursor)
    next.setMonth(next.getMonth() + 1)
    const days = daysBetween(cursor, next)
    const interest = accrueInterest(balance, annualRatePct, days)
    let principal = emiAmount - interest
    if (principal <= 0) break
    if (principal > balance) principal = balance
    const closing = Math.max(0, balance - principal)
    schedule.push({ month, opening: balance, interest, principal, closing, days, date: next.toISOString().slice(0, 10) })
    balance = closing
    cursor = next
    month++
  }
  return schedule
}

export function totalInterest(schedule) {
  return schedule.reduce((s, row) => s + row.interest, 0)
}
