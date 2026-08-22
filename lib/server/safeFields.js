export const safeFields = {
  accounts: ['name', 'type', 'bank_name', 'account_number_last4', 'opening_balance', 'currency', 'color', 'icon', 'is_active', 'linked_account_id'],
  categories: ['name', 'type', 'icon', 'color', 'is_default'],
  transactions: ['account_id', 'category_id', 'amount', 'type', 'description', 'date', 'time', 'notes', 'linked_module', 'linked_module_id', 'transfer_group_id', 'transfer_direction', 'attachment_path', 'attachment_name'],
  recurring_transactions: ['account_id', 'category_id', 'type', 'amount', 'description', 'notes', 'frequency', 'day_of_month', 'next_due_date', 'is_active'],
  budgets: ['category_id', 'amount', 'period', 'start_date'],
  portfolios: ['name', 'broker', 'demat_account_id', 'color'],
  holdings: ['portfolio_id', 'symbol', 'exchange', 'company_name', 'qty', 'avg_buy_price', 'current_price', 'last_price_updated_at', 'source', 'asset_type'],
  sips: ['fund_name', 'folio_number', 'monthly_amount', 'start_date', 'units_held', 'nav', 'current_value', 'average_price', 'portfolio_id'],
  other_investments: ['portfolio_id', 'name', 'category', 'purchase_value', 'purchase_date', 'expected_cagr_pct', 'last_known_value', 'last_known_value_date', 'face_value', 'coupon_rate_pct', 'maturity_date', 'interest_frequency', 'notes'],
  loans: ['name', 'lender', 'principal', 'interest_rate', 'tenure_months', 'emi_amount', 'start_date', 'total_interest', 'status', 'paid_from_account_id', 'outstanding', 'interest_saved', 'emi_due_day'],
  loan_payments: ['loan_id', 'amount', 'type', 'payment_date', 'account_id', 'interest_saved', 'interest_portion', 'prepay_mode', 'outstanding_before', 'emi_before', 'linked_transaction_id', 'notes'],
  bucket_list: ['title', 'estimated_cost', 'priority', 'target_date', 'status', 'notes'],
  lend_borrow: ['person_name', 'type', 'amount', 'date', 'due_date', 'from_account_id', 'reason', 'status', 'notes'],
  lend_repayments: ['lend_borrow_id', 'amount', 'date', 'account_id', 'linked_transaction_id', 'notes'],
  profiles: ['full_name', 'age', 'avatar_url', 'theme', 'currency', 'kite_access_token', 'kite_access_token_at', 'block_insufficient_funds'],
  credit_cards: ['name', 'bank', 'last4', 'credit_limit', 'billing_date', 'due_date_offset', 'current_outstanding', 'color'],
  credit_card_transactions: ['credit_card_id', 'amount', 'description', 'category_id', 'date', 'time', 'status', 'linked_transaction_id'],
  scholarships: ['name', 'total_amount', 'academic_year', 'source', 'status', 'received_date', 'due_date', 'received_to_account_id', 'amount_paid_to_college', 'notes'],
  scholarship_payments: ['scholarship_id', 'amount', 'paid_to', 'payment_date', 'account_id', 'notes'],
  money_rules: ['rule_text', 'icon', 'order_index', 'is_active'],
  money_profiles: ['name', 'profile_type', 'linked_account_id', 'opening_balance', 'opening_balance_date', 'status', 'categories', 'notes'],
  money_profile_entries: ['profile_id', 'entry_type', 'category', 'description', 'amount', 'date', 'paid_party', 'notes'],
}

export function pickFields(table, source) {
  return Object.fromEntries((safeFields[table] || []).filter((field) => source[field] !== undefined).map((field) => [field, source[field]]))
}
