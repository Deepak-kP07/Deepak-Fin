import { pgTable, pgSchema, pgEnum, uuid, text, numeric, integer, boolean, timestamp, date, time, jsonb, check, unique, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// auth.users is managed by Supabase, not by this app's migrations — declared
// here only so user_id/id columns below can reference it with a real FK.
const authSchema = pgSchema('auth')
export const authUsers = authSchema.table('users', {
  id: uuid('id').primaryKey(),
})

export const accountType = pgEnum('account_type', ['bank', 'cash', 'credit_card', 'wallet', 'startup', 'debit_card'])
export const categoryType = pgEnum('category_type', ['income', 'expense'])
export const transactionType = pgEnum('transaction_type', ['income', 'expense', 'transfer'])
export const budgetPeriod = pgEnum('budget_period', ['monthly', 'yearly'])
export const recurringFrequency = pgEnum('recurring_frequency', ['weekly', 'monthly', 'yearly'])

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: accountType('type').notNull().default('bank'),
  bankName: text('bank_name'),
  accountNumberLast4: text('account_number_last4'),
  openingBalance: numeric('opening_balance', { precision: 14, scale: 2 }).notNull().default('0'),
  currentBalance: numeric('current_balance', { precision: 14, scale: 2 }).notNull().default('0'),
  currency: text('currency').notNull().default('INR'),
  color: text('color'),
  icon: text('icon'),
  isActive: boolean('is_active').notNull().default(true),
  // Only set when type = 'debit_card': the bank account this card draws from.
  // A debit card has no balance of its own — transactions against it resolve
  // to this linked account instead, so it's purely a named alias.
  linkedAccountId: uuid('linked_account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('accounts_user_id_idx').on(t.userId)])

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: categoryType('type').notNull(),
  icon: text('icon'),
  color: text('color'),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique('categories_user_id_name_type_key').on(t.userId, t.name, t.type), index('categories_user_id_idx').on(t.userId)])

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  type: transactionType('type').notNull(),
  description: text('description').notNull(),
  date: date('date').notNull().defaultNow(),
  time: time('time'),
  notes: text('notes'),
  linkedModule: text('linked_module'),
  linkedModuleId: uuid('linked_module_id'),
  transferGroupId: uuid('transfer_group_id'),
  transferDirection: text('transfer_direction'),
  // One receipt/attachment per transaction — stored in the private `attachments` Supabase
  // Storage bucket under `${userId}/...`, path kept alongside the public-ish signed-URL-free
  // reference so it can be looked up/deleted without re-deriving it.
  attachmentPath: text('attachment_path'),
  attachmentName: text('attachment_name'),
  recurringSourceId: uuid('recurring_source_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('transactions_amount_check', sql`${t.amount} >= 0`),
  check('transactions_transfer_direction_check', sql`${t.transferDirection} in ('out','in')`),
  index('transactions_user_date_idx').on(t.userId, t.date.desc()),
  index('transactions_user_account_idx').on(t.userId, t.accountId),
  index('transactions_transfer_group_idx').on(t.transferGroupId),
])

// A transaction's prior state, snapshotted right before an edit overwrites it — lets the user
// see what an amount/description/category used to be instead of the edit being silently lossy.
export const transactionEditHistory = pgTable('transaction_edit_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionId: uuid('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  previousValues: jsonb('previous_values').notNull(),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('tx_history_tx_idx').on(t.transactionId), index('tx_history_user_idx').on(t.userId)])

// A rule for auto-generating transactions on a schedule (rent, salary, SIPs, subscriptions).
// No cron infra exists in this app, so due occurrences are generated lazily — whenever the
// summary endpoint is hit, any rule whose nextDueDate has passed gets caught up to today.
export const recurringTransactions = pgTable('recurring_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  type: transactionType('type').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  description: text('description').notNull(),
  notes: text('notes'),
  frequency: recurringFrequency('frequency').notNull().default('monthly'),
  dayOfMonth: integer('day_of_month'),
  nextDueDate: date('next_due_date').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  lastGeneratedDate: date('last_generated_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check('recurring_transactions_amount_check', sql`${t.amount} > 0`), index('recurring_user_idx').on(t.userId)])

export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  period: budgetPeriod('period').notNull().default('monthly'),
  startDate: date('start_date').notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check('budgets_amount_check', sql`${t.amount} >= 0`), index('budgets_user_id_idx').on(t.userId)])

export const portfolios = pgTable('portfolios', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  broker: text('broker').notNull().default('other'),
  dematAccountId: uuid('demat_account_id').references(() => accounts.id, { onDelete: 'set null' }),
  cashBalance: numeric('cash_balance', { precision: 14, scale: 2 }).notNull().default('0'),
  color: text('color'),
  kiteLinked: boolean('kite_linked').notNull().default(false),
  lastKiteSyncAt: timestamp('last_kite_sync_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check('portfolios_cash_balance_check', sql`${t.cashBalance} >= 0`), index('portfolios_user_id_idx').on(t.userId)])

export const holdings = pgTable('holdings', {
  id: uuid('id').primaryKey().defaultRandom(),
  portfolioId: uuid('portfolio_id').notNull().references(() => portfolios.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  symbol: text('symbol').notNull(),
  exchange: text('exchange').notNull().default('NSE'),
  companyName: text('company_name'),
  qty: numeric('qty', { precision: 18, scale: 4 }).notNull().default('0'),
  avgBuyPrice: numeric('avg_buy_price', { precision: 14, scale: 2 }).notNull().default('0'),
  currentPrice: numeric('current_price', { precision: 14, scale: 2 }).notNull().default('0'),
  lastPriceUpdatedAt: timestamp('last_price_updated_at', { withTimezone: true }),
  source: text('source').notNull().default('manual'),
  kiteInstrumentToken: text('kite_instrument_token'),
  assetType: text('asset_type').notNull().default('equity'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check('holdings_source_check', sql`${t.source} in ('manual','kite','import')`), check('holdings_asset_type_check', sql`${t.assetType} in ('equity','gold')`), index('holdings_user_id_idx').on(t.userId), index('holdings_portfolio_idx').on(t.portfolioId)])

export const sips = pgTable('sips', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  // Nullable — plenty of SIPs won't belong to any portfolio. Kite-synced rows get this stamped
  // automatically to whichever portfolio is currently kite_linked; manual ones can optionally
  // pick one too. Purely a display/grouping label — never affects a portfolio's cash_balance.
  portfolioId: uuid('portfolio_id').references(() => portfolios.id, { onDelete: 'set null' }),
  fundName: text('fund_name').notNull(),
  folioNumber: text('folio_number'),
  monthlyAmount: numeric('monthly_amount', { precision: 14, scale: 2 }).notNull().default('0'),
  startDate: date('start_date').notNull().defaultNow(),
  unitsHeld: numeric('units_held', { precision: 18, scale: 4 }).notNull().default('0'),
  nav: numeric('nav', { precision: 14, scale: 4 }).notNull().default('0'),
  currentValue: numeric('current_value', { precision: 14, scale: 2 }).notNull().default('0'),
  averagePrice: numeric('average_price', { precision: 14, scale: 4 }),
  source: text('source').notNull().default('manual'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check('sips_source_check', sql`${t.source} in ('manual','kite')`), index('sips_user_id_idx').on(t.userId)])

// For assets with no exchange/live price at all — physical gold, silver, land, and anything
// else — where "current value" can only ever be a projection: purchase_value compounded by
// expectedCagrPct from purchaseDate, optionally rebased onto a manually-entered real-world
// correction (lastKnownValue/lastKnownValueDate) when the user actually finds out a truer
// number (a revaluation, today's gold rate, etc.). purchaseValue itself never changes — it's
// always the true cost basis for P&L, independent of that rebasing.
export const otherInvestments = pgTable('other_investments', {
  id: uuid('id').primaryKey().defaultRandom(),
  portfolioId: uuid('portfolio_id').notNull().references(() => portfolios.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category').notNull().default('other'),
  purchaseValue: numeric('purchase_value', { precision: 14, scale: 2 }).notNull().default('0'),
  purchaseDate: date('purchase_date').notNull().defaultNow(),
  expectedCagrPct: numeric('expected_cagr_pct', { precision: 6, scale: 2 }).notNull().default('0'),
  lastKnownValue: numeric('last_known_value', { precision: 14, scale: 2 }),
  lastKnownValueDate: date('last_known_value_date'),
  // Bond-specific — nullable, only populated when category = 'bond'. A bond's value isn't a CAGR
  // projection like gold/silver/land: it's a known contract, so currentValueOf() straight-line
  // accretes from purchaseValue up to faceValue between purchaseDate and maturityDate instead of
  // compounding expectedCagrPct (which stays unused/0 for bond rows).
  faceValue: numeric('face_value', { precision: 14, scale: 2 }),
  couponRatePct: numeric('coupon_rate_pct', { precision: 6, scale: 2 }),
  maturityDate: date('maturity_date'),
  interestFrequency: text('interest_frequency'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('other_investments_category_check', sql`${t.category} in ('gold','silver','land','bond','other')`),
  check('other_investments_interest_frequency_check', sql`${t.interestFrequency} is null or ${t.interestFrequency} in ('annual','semi_annual','quarterly','monthly','cumulative')`),
  index('other_investments_user_id_idx').on(t.userId),
  index('other_investments_portfolio_idx').on(t.portfolioId),
])

export const kiteOrders = pgTable('kite_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  kiteOrderId: text('kite_order_id').notNull(),
  segment: text('segment').notNull(),
  tradingsymbol: text('tradingsymbol').notNull(),
  exchange: text('exchange'),
  transactionType: text('transaction_type').notNull(),
  quantity: numeric('quantity', { precision: 18, scale: 4 }),
  price: numeric('price', { precision: 14, scale: 4 }),
  averagePrice: numeric('average_price', { precision: 14, scale: 4 }),
  status: text('status'),
  orderTimestamp: timestamp('order_timestamp', { withTimezone: true }),
  fund: text('fund'),
  folio: text('folio'),
  syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check('kite_orders_segment_check', sql`${t.segment} in ('equity','mf')`), unique('kite_orders_user_order_unique').on(t.userId, t.kiteOrderId), index('kite_orders_user_idx').on(t.userId)])

export const loans = pgTable('loans', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  lender: text('lender'),
  principal: numeric('principal', { precision: 14, scale: 2 }).notNull().default('0'),
  interestRate: numeric('interest_rate', { precision: 6, scale: 3 }).notNull().default('0'),
  tenureMonths: integer('tenure_months').notNull().default(0),
  emiAmount: numeric('emi_amount', { precision: 14, scale: 2 }).notNull().default('0'),
  startDate: date('start_date').notNull().defaultNow(),
  totalInterest: numeric('total_interest', { precision: 14, scale: 2 }).notNull().default('0'),
  status: text('status').notNull().default('active'),
  paidFromAccountId: uuid('paid_from_account_id').references(() => accounts.id, { onDelete: 'set null' }),
  outstanding: numeric('outstanding', { precision: 14, scale: 2 }).notNull().default('0'),
  interestSaved: numeric('interest_saved', { precision: 14, scale: 2 }).notNull().default('0'),
  emiDueDay: integer('emi_due_day'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('loans_user_id_idx').on(t.userId)])

export const loanPayments = pgTable('loan_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  loanId: uuid('loan_id').notNull().references(() => loans.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  type: text('type').notNull().default('emi'),
  paymentDate: date('payment_date').notNull().defaultNow(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  interestSaved: numeric('interest_saved', { precision: 14, scale: 2 }),
  interestPortion: numeric('interest_portion', { precision: 14, scale: 2 }),
  prepayMode: text('prepay_mode'),
  outstandingBefore: numeric('outstanding_before', { precision: 14, scale: 2 }),
  emiBefore: numeric('emi_before', { precision: 14, scale: 2 }),
  linkedTransactionId: uuid('linked_transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check('loan_payments_amount_check', sql`${t.amount} > 0`), index('loan_payments_loan_idx').on(t.loanId), index('loan_payments_user_idx').on(t.userId)])

export const bucketList = pgTable('bucket_list', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  estimatedCost: numeric('estimated_cost', { precision: 14, scale: 2 }).notNull().default('0'),
  priority: text('priority').notNull().default('medium'),
  targetDate: date('target_date'),
  status: text('status').notNull().default('wishlist'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('bucket_user_idx').on(t.userId)])

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().references(() => authUsers.id, { onDelete: 'cascade' }),
  fullName: text('full_name'),
  age: integer('age'),
  avatarUrl: text('avatar_url'),
  theme: text('theme').notNull().default('dark'),
  currency: text('currency').notNull().default('INR'),
  kiteAccessToken: text('kite_access_token'),
  kiteAccessTokenAt: timestamp('kite_access_token_at', { withTimezone: true }),
  // Set by the sync services themselves on every attempt (regardless of whether it produced
  // any rows) — MF/orders are user-level, not tied to a portfolio, so unlike equity holdings
  // (which key staleness off the linked portfolio's own last_kite_sync_at) they need their own
  // clock here rather than one derived from row data, or a user with genuinely zero MF holdings
  // would get re-fetched on every single app action forever (nothing to anchor "already tried").
  kiteMfSyncedAt: timestamp('kite_mf_synced_at', { withTimezone: true }),
  kiteOrdersSyncedAt: timestamp('kite_orders_synced_at', { withTimezone: true }),
  // Set on any sync failure (holdings/MF/orders — any one failing means the token is bad),
  // cleared on success or a fresh /kite/callback login. This is what "is Kite actually broken"
  // means — kite_access_token/kite_access_token_at alone only prove a token exists and is
  // recent, not that it still works (e.g. after swapping which Kite app's key/secret is
  // configured, the old token looks perfectly fresh but every real call 403s).
  kiteLastError: text('kite_last_error'),
  // Default behavior when a bank/cash/debit-card transaction would exceed the account's
  // balance: true = block it outright, false = allow it through a "confirm anyway" prompt.
  // Credit cards have no equivalent toggle — going over the limit is always blocked.
  blockInsufficientFunds: boolean('block_insufficient_funds').notNull().default(true),
  // Scholarships is an opt-in module — off by default, only shown in the nav once the user
  // turns it on from their profile settings.
  scholarshipsEnabled: boolean('scholarships_enabled').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const lendBorrow = pgTable('lend_borrow', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  personName: text('person_name').notNull(),
  type: text('type').notNull().default('lent'),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  date: date('date').notNull().defaultNow(),
  dueDate: date('due_date'),
  fromAccountId: uuid('from_account_id').references(() => accounts.id, { onDelete: 'set null' }),
  reason: text('reason'),
  status: text('status').notNull().default('pending'),
  amountRepaid: numeric('amount_repaid', { precision: 14, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  linkedTransactionId: uuid('linked_transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check('lend_borrow_amount_check', sql`${t.amount} > 0`), index('lend_borrow_user_idx').on(t.userId)])

export const lendRepayments = pgTable('lend_repayments', {
  id: uuid('id').primaryKey().defaultRandom(),
  lendBorrowId: uuid('lend_borrow_id').notNull().references(() => lendBorrow.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  date: date('date').notNull().defaultNow(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  linkedTransactionId: uuid('linked_transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check('lend_repayments_amount_check', sql`${t.amount} > 0`), index('lend_repayments_lb_idx').on(t.lendBorrowId), index('lend_repayments_user_idx').on(t.userId)])

export const creditCards = pgTable('credit_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  bank: text('bank'),
  last4: text('last4'),
  creditLimit: numeric('credit_limit', { precision: 14, scale: 2 }).notNull().default('0'),
  billingDate: integer('billing_date').notNull().default(1),
  dueDateOffset: integer('due_date_offset').notNull().default(15),
  currentOutstanding: numeric('current_outstanding', { precision: 14, scale: 2 }).notNull().default('0'),
  color: text('color'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('credit_cards_user_idx').on(t.userId)])

export const creditCardTransactions = pgTable('credit_card_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  creditCardId: uuid('credit_card_id').notNull().references(() => creditCards.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  description: text('description').notNull(),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  date: date('date').notNull().defaultNow(),
  time: time('time'),
  status: text('status').notNull().default('pending'),
  linkedBillPaymentId: uuid('linked_bill_payment_id'),
  linkedTransactionId: uuid('linked_transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check('credit_card_transactions_amount_check', sql`${t.amount} > 0`), index('cct_card_idx').on(t.creditCardId), index('cct_user_idx').on(t.userId)])

export const scholarships = pgTable('scholarships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull().default('0'),
  academicYear: text('academic_year'),
  source: text('source'),
  status: text('status').notNull().default('pending'),
  receivedDate: date('received_date'),
  dueDate: date('due_date'),
  receivedToAccountId: uuid('received_to_account_id').references(() => accounts.id, { onDelete: 'set null' }),
  amountPaidToCollege: numeric('amount_paid_to_college', { precision: 14, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  linkedTransactionId: uuid('linked_transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
  attachmentPath: text('attachment_path'),
  attachmentName: text('attachment_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('scholarships_user_idx').on(t.userId)])

export const scholarshipPayments = pgTable('scholarship_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  scholarshipId: uuid('scholarship_id').notNull().references(() => scholarships.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  paidTo: text('paid_to'),
  paymentDate: date('payment_date').notNull().defaultNow(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  linkedTransactionId: uuid('linked_transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
  notes: text('notes'),
  attachmentPath: text('attachment_path'),
  attachmentName: text('attachment_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check('scholarship_payments_amount_check', sql`${t.amount} > 0`), index('scholarship_payments_scholarship_idx').on(t.scholarshipId), index('scholarship_payments_user_idx').on(t.userId)])

export const moneyProfiles = pgTable('money_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  profileType: text('profile_type').notNull().default('family'),
  // Set only at creation; the entry-creation side-effect (lib/server/genericCrud.js) checks this
  // to decide whether to mirror an entry into transactions — never re-toggled after the fact.
  linkedAccountId: uuid('linked_account_id').references(() => accounts.id, { onDelete: 'set null' }),
  openingBalance: numeric('opening_balance', { precision: 14, scale: 2 }).notNull().default('0'),
  openingBalanceDate: date('opening_balance_date').notNull().defaultNow(),
  // 'closed' blocks new entries (manual and bulk-import) until switched back to 'active' —
  // existing entries stay fully visible/editable either way, only creation is gated.
  status: text('status').notNull().default('active'),
  // User-customizable per profile (add/remove in the UI) — seeded with a few sensible starters
  // at creation so the entry form always has something to pick from immediately.
  categories: text('categories').array().notNull().default(sql`ARRAY['Salary','Rent','Groceries','Utilities','Other']::text[]`),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('money_profiles_type_check', sql`${t.profileType} in ('family','company','other')`),
  check('money_profiles_status_check', sql`${t.status} in ('active','closed')`),
  index('money_profiles_user_idx').on(t.userId),
])

export const moneyProfileEntries = pgTable('money_profile_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => moneyProfiles.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  entryType: text('entry_type').notNull().default('expense'),
  category: text('category'),
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  date: date('date').notNull().defaultNow(),
  paidParty: text('paid_party'),
  notes: text('notes'),
  linkedTransactionId: uuid('linked_transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('money_profile_entries_type_check', sql`${t.entryType} in ('income','expense','capital')`),
  check('money_profile_entries_amount_check', sql`${t.amount} > 0`),
  index('money_profile_entries_profile_idx').on(t.profileId),
  index('money_profile_entries_user_idx').on(t.userId),
])

export const moneyRules = pgTable('money_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  ruleText: text('rule_text').notNull(),
  icon: text('icon'),
  orderIndex: integer('order_index').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('money_rules_user_idx').on(t.userId)])
