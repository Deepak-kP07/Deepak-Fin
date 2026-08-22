// Shared credit-card billing-cycle math — a card bills on `billing_date` (day of month) and
// payment is due `due_date_offset` days after that. Extracted from two previously-drifting
// copies (CreditCardDetailView.jsx and CreditCardFlip.jsx) so a change to the due-day window
// only has to happen once.

// Due date and days-remaining for the currently active (most recently billed) cycle. Rolls
// forward to next month's cycle only once the DUE date itself has passed — not the billing
// date — since the bill is very much still open and awaiting payment for the whole stretch
// between those two dates. Rolling on the billing date alone (the original bug here) meant the
// "due in N days" figure jumped ahead to next month the moment the billing date passed, so it
// never actually counted down through the real due window.
export function nextBillDue(card) {
  const now = new Date()
  const bd = Number(card.billing_date), offset = Number(card.due_date_offset)
  let billing = new Date(now.getFullYear(), now.getMonth(), bd)
  let due = new Date(billing); due.setDate(due.getDate() + offset)
  if (now > due) {
    billing = new Date(now.getFullYear(), now.getMonth() + 1, bd)
    due = new Date(billing); due.setDate(due.getDate() + offset)
  }
  const days = Math.ceil((due - now) / (1000 * 60 * 60 * 24))
  return { due, days, billing }
}

// Bill payments are logged through /finance/credit_cards/:id/pay_bill, which creates a plain
// transaction with a fixed, app-generated description rather than a linked_module reference —
// matching on that description is how "has this been paid" gets found among all transactions
// (same approach CreditCardDetailView's repayment history already uses).
const billPaymentDescription = (card) => `Credit card bill · ${card.name}`

// Has a real "Pay bill" payment already been logged since the current cycle's bill was issued?
export function isBillPaidThisCycle(card, transactions) {
  const { billing } = nextBillDue(card)
  return transactions.some((t) => t.type === 'expense' && t.description === billPaymentDescription(card) && new Date(t.date) >= billing)
}

// Cards with a real, still-unpaid balance whose due date is within `thresholdDays` (or already
// past) — the set that should trigger a "pay your bill soon" alert.
export function cardsDueSoon(creditCards, transactions, thresholdDays = 4) {
  return creditCards
    .map((card) => ({ card, ...nextBillDue(card) }))
    .filter(({ card, days }) => Number(card.current_outstanding) > 0 && days <= thresholdDays && !isBillPaidThisCycle(card, transactions))
    .sort((a, b) => a.days - b.days)
}
