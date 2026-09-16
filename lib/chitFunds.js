// Next due date for a chit fund's monthly contribution — the (monthsPaid)-th slot in its
// duration_months schedule starting at start_date, day-of-month clamped to the actual month
// length (unlike loans'/credit cards' nextLoanDueDate/nextBillDue, which silently roll a 29-31
// day-of-month into the *following* month when the current one is shorter — same clamp already
// used by ChitFundDetailView's payment calendar, just shared here so the cron notification job
// can reuse the identical logic instead of a second, potentially-drifting copy). Returns null
// once every month's been paid or the fund isn't tracking a real schedule.
export function nextChitFundDueDate(fund, monthsPaid) {
  const total = Number(fund.duration_months || 0)
  if (total <= 0 || !fund.start_date || monthsPaid >= total) return null
  const day = new Date(`${fund.start_date}T00:00:00`).getDate()
  const cursor = new Date(`${fund.start_date}T00:00:00`)
  cursor.setMonth(cursor.getMonth() + monthsPaid)
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  return new Date(cursor.getFullYear(), cursor.getMonth(), Math.min(day, daysInMonth))
}
