export function applyOrder(query, table) {
  if (table === 'transactions' || table === 'credit_card_transactions' || table === 'zopkit_transactions') {
    return query.order('date', { ascending: false }).order('time', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
  }
  if (table === 'lend_borrow' || table === 'lend_repayments') return query.order('date', { ascending: false })
  if (table === 'kite_orders') return query.order('order_timestamp', { ascending: false, nullsFirst: false })
  if (table === 'loan_payments' || table === 'scholarship_payments') return query.order('payment_date', { ascending: false })
  if (table === 'categories') return query.order('type', { ascending: true }).order('name', { ascending: true })
  if (table === 'money_rules') return query.order('order_index', { ascending: true }).order('created_at', { ascending: true })
  if (table === 'accounts' || table === 'portfolios' || table === 'holdings' || table === 'credit_cards' || table === 'other_investments') return query.order('created_at', { ascending: true })
  if (table === 'recurring_transactions') return query.order('next_due_date', { ascending: true })
  return query.order('created_at', { ascending: false })
}
