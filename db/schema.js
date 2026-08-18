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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('portfolios_user_id_idx').on(t.userId)])

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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('holdings_user_id_idx').on(t.userId), index('holdings_portfolio_idx').on(t.portfolioId)])

export const sips = pgTable('sips', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  fundName: text('fund_name').notNull(),
  folioNumber: text('folio_number'),
  monthlyAmount: numeric('monthly_amount', { precision: 14, scale: 2 }).notNull().default('0'),
  startDate: date('start_date').notNull().defaultNow(),
  unitsHeld: numeric('units_held', { precision: 18, scale: 4 }).notNull().default('0'),
  nav: numeric('nav', { precision: 14, scale: 4 }).notNull().default('0'),
  currentValue: numeric('current_value', { precision: 14, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('sips_user_id_idx').on(t.userId)])

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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check('scholarship_payments_amount_check', sql`${t.amount} > 0`), index('scholarship_payments_scholarship_idx').on(t.scholarshipId), index('scholarship_payments_user_idx').on(t.userId)])

export const zopkitTransactions = pgTable('zopkit_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  type: text('type').notNull().default('expense'),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  description: text('description').notNull(),
  category: text('category'),
  date: date('date').notNull().defaultNow(),
  time: time('time'),
  addedBy: text('added_by').notNull().default('self'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check('zopkit_transactions_amount_check', sql`${t.amount} > 0`), index('zopkit_user_idx').on(t.userId)])

export const moneyRules = pgTable('money_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  ruleText: text('rule_text').notNull(),
  icon: text('icon'),
  orderIndex: integer('order_index').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('money_rules_user_idx').on(t.userId)])
