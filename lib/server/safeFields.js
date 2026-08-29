export const safeFields = {
  accounts: ['name', 'type', 'bank_name', 'account_number_last4', 'opening_balance', 'opening_balance_date', 'currency', 'color', 'icon', 'is_active', 'linked_account_id', 'order_index'],
  categories: ['name', 'type', 'icon', 'color', 'is_default', 'order_index', 'hidden_in_modules'],
  transactions: ['account_id', 'category_id', 'amount', 'type', 'description', 'date', 'time', 'notes', 'linked_module', 'linked_module_id', 'transfer_group_id', 'transfer_direction', 'attachment_path', 'attachment_name'],
  recurring_transactions: ['account_id', 'category_id', 'type', 'amount', 'description', 'notes', 'frequency', 'day_of_month', 'next_due_date', 'is_active'],
  budgets: ['category_id', 'amount', 'period', 'start_date'],
  portfolios: ['name', 'broker', 'demat_account_id', 'color'],
  holdings: ['portfolio_id', 'symbol', 'exchange', 'company_name', 'qty', 'avg_buy_price', 'current_price', 'last_price_updated_at', 'source', 'asset_type'],
  sips: ['fund_name', 'folio_number', 'monthly_amount', 'start_date', 'units_held', 'nav', 'current_value', 'average_price', 'portfolio_id'],
  other_investments: ['portfolio_id', 'name', 'category', 'purchase_value', 'purchase_date', 'expected_cagr_pct', 'last_known_value', 'last_known_value_date', 'face_value', 'coupon_rate_pct', 'maturity_date', 'interest_frequency', 'notes'],
  loans: ['name', 'lender', 'principal', 'interest_rate', 'tenure_months', 'emi_amount', 'start_date', 'total_interest', 'status', 'paid_from_account_id', 'outstanding', 'interest_saved', 'emi_due_day'],
  loan_payments: ['loan_id', 'amount', 'type', 'payment_date', 'account_id', 'interest_saved', 'interest_portion', 'prepay_mode', 'outstanding_before', 'emi_before', 'linked_transaction_id', 'notes'],
  bucket_list: ['title', 'product_url', 'estimated_cost', 'reasons'],
  lend_borrow: ['person_name', 'type', 'amount', 'date', 'due_date', 'from_account_id', 'reason', 'status', 'notes'],
  lend_repayments: ['lend_borrow_id', 'amount', 'date', 'account_id', 'linked_transaction_id', 'notes'],
  // kite_access_token/kite_access_token_at are deliberately excluded — like
  // lastWeeklyReportSentAt/lastMonthlyReportSentAt (db/schema.js), they're only ever meant to be
  // set by the OAuth callback/kiteSync service, never a raw client PATCH.
  profiles: ['full_name', 'age', 'avatar_url', 'theme', 'accent_color', 'currency', 'block_insufficient_funds', 'module_settings', 'dashboard_widgets', 'mobile_nav_settings', 'weekly_report_enabled', 'monthly_report_enabled', 'tour_completed_at'],
  credit_cards: ['name', 'bank', 'last4', 'credit_limit', 'billing_date', 'due_date_offset', 'current_outstanding', 'color'],
  credit_card_transactions: ['credit_card_id', 'amount', 'description', 'category_id', 'date', 'time', 'status', 'linked_transaction_id'],
  scholarships: ['name', 'total_amount', 'academic_year', 'source', 'status', 'received_date', 'due_date', 'received_to_account_id', 'amount_paid_to_college', 'notes', 'attachment_path', 'attachment_name'],
  scholarship_payments: ['scholarship_id', 'amount', 'paid_to', 'payment_date', 'account_id', 'notes', 'attachment_path', 'attachment_name'],
  money_rules: ['rule_text', 'icon', 'order_index', 'is_active'],
  money_profiles: ['name', 'profile_type', 'linked_account_id', 'opening_balance', 'opening_balance_date', 'status', 'notes'],
  money_profile_entries: ['profile_id', 'entry_type', 'category_id', 'description', 'amount', 'date', 'paid_party', 'notes', 'account_id'],
  recurring_money_profile_entries: ['profile_id', 'entry_type', 'category_id', 'account_id', 'description', 'amount', 'notes', 'paid_party', 'frequency', 'next_due_date', 'is_active'],
  // status/closed_at are intentionally excluded — they only ever change via the dedicated
  // close/reopen action routes, never a raw PATCH, so a plan can't silently unlock itself.
  budget_months: ['year', 'month', 'total_amount'],
  budget_month_categories: ['category_id', 'amount'],
  // encrypted_payload is deliberately excluded — it's only ever set by the vault_items routes'
  // own encrypt-on-write code (lib/server/vaultCrypto.js), never through a raw PATCH passthrough.
  vault_items: ['item_type', 'label', 'bank_name', 'last4', 'color', 'linked_account_id', 'order_index'],
  push_subscriptions: ['endpoint', 'p256dh', 'auth'],
}

export function pickFields(table, source) {
  return Object.fromEntries((safeFields[table] || []).filter((field) => source[field] !== undefined).map((field) => [field, source[field]]))
}
