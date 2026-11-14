// Small per-module helpers used by more than one screen.
export const pendingOf = (r) => Math.max(0, Number(r.amount || 0) - Number(r.amount_repaid || 0))

// Chit funds — same formulas as the web ChitFundsView: net paid = amount − dividend received.
export const chitPayments = (payments, fundId) => (payments || []).filter((p) => p.chit_fund_id === fundId)
export const chitNetPaid = (payments, fundId) => chitPayments(payments, fundId).reduce((s, p) => s + Number(p.amount) - Number(p.dividend_received || 0), 0)
export const chitMonthsPaid = (payments, fundId) => chitPayments(payments, fundId).length
