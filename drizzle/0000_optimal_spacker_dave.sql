CREATE TYPE "public"."account_type" AS ENUM('bank', 'cash', 'credit_card', 'wallet', 'startup');--> statement-breakpoint
CREATE TYPE "public"."budget_period" AS ENUM('monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."category_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('income', 'expense', 'transfer');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "account_type" DEFAULT 'bank' NOT NULL,
	"bank_name" text,
	"account_number_last4" text,
	"opening_balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"current_balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"color" text,
	"icon" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- auth.users is managed by Supabase Auth and already exists — do not create it.
CREATE TABLE "bucket_list" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"estimated_cost" numeric(14, 2) DEFAULT '0' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"target_date" date,
	"status" text DEFAULT 'wishlist' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category_id" uuid,
	"amount" numeric(14, 2) NOT NULL,
	"period" "budget_period" DEFAULT 'monthly' NOT NULL,
	"start_date" date DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budgets_amount_check" CHECK ("budgets"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "category_type" NOT NULL,
	"icon" text,
	"color" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_user_id_name_type_key" UNIQUE("user_id","name","type")
);
--> statement-breakpoint
CREATE TABLE "credit_card_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credit_card_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"description" text NOT NULL,
	"category_id" uuid,
	"date" date DEFAULT now() NOT NULL,
	"time" time,
	"status" text DEFAULT 'pending' NOT NULL,
	"linked_bill_payment_id" uuid,
	"linked_transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_card_transactions_amount_check" CHECK ("credit_card_transactions"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "credit_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"bank" text,
	"last4" text,
	"credit_limit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"billing_date" integer DEFAULT 1 NOT NULL,
	"due_date_offset" integer DEFAULT 15 NOT NULL,
	"current_outstanding" numeric(14, 2) DEFAULT '0' NOT NULL,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holdings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"symbol" text NOT NULL,
	"exchange" text DEFAULT 'NSE' NOT NULL,
	"company_name" text,
	"qty" numeric(18, 4) DEFAULT '0' NOT NULL,
	"avg_buy_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"current_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"last_price_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lend_borrow" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"person_name" text NOT NULL,
	"type" text DEFAULT 'lent' NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"date" date DEFAULT now() NOT NULL,
	"due_date" date,
	"from_account_id" uuid,
	"reason" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"amount_repaid" numeric(14, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"linked_transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lend_borrow_amount_check" CHECK ("lend_borrow"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "lend_repayments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lend_borrow_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"date" date DEFAULT now() NOT NULL,
	"account_id" uuid,
	"linked_transaction_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lend_repayments_amount_check" CHECK ("lend_repayments"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "loan_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"type" text DEFAULT 'emi' NOT NULL,
	"payment_date" date DEFAULT now() NOT NULL,
	"account_id" uuid,
	"interest_saved" numeric(14, 2),
	"linked_transaction_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loan_payments_amount_check" CHECK ("loan_payments"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"lender" text,
	"principal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"interest_rate" numeric(6, 3) DEFAULT '0' NOT NULL,
	"tenure_months" integer DEFAULT 0 NOT NULL,
	"emi_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"start_date" date DEFAULT now() NOT NULL,
	"total_interest" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"paid_from_account_id" uuid,
	"outstanding" numeric(14, 2) DEFAULT '0' NOT NULL,
	"interest_saved" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "money_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"rule_text" text NOT NULL,
	"icon" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"broker" text DEFAULT 'other' NOT NULL,
	"demat_account_id" uuid,
	"cash_balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"full_name" text,
	"age" integer,
	"avatar_url" text,
	"theme" text DEFAULT 'dark' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"kite_access_token" text,
	"kite_access_token_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scholarship_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scholarship_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"paid_to" text,
	"payment_date" date DEFAULT now() NOT NULL,
	"account_id" uuid,
	"linked_transaction_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scholarship_payments_amount_check" CHECK ("scholarship_payments"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "scholarships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"academic_year" text,
	"source" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"received_date" date,
	"due_date" date,
	"received_to_account_id" uuid,
	"amount_paid_to_college" numeric(14, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"linked_transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"fund_name" text NOT NULL,
	"folio_number" text,
	"monthly_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"start_date" date DEFAULT now() NOT NULL,
	"units_held" numeric(18, 4) DEFAULT '0' NOT NULL,
	"nav" numeric(14, 4) DEFAULT '0' NOT NULL,
	"current_value" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid,
	"category_id" uuid,
	"amount" numeric(14, 2) NOT NULL,
	"type" "transaction_type" NOT NULL,
	"description" text NOT NULL,
	"date" date DEFAULT now() NOT NULL,
	"time" time,
	"notes" text,
	"linked_module" text,
	"linked_module_id" uuid,
	"transfer_group_id" uuid,
	"transfer_direction" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_amount_check" CHECK ("transactions"."amount" >= 0),
	CONSTRAINT "transactions_transfer_direction_check" CHECK ("transactions"."transfer_direction" in ('out','in'))
);
--> statement-breakpoint
CREATE TABLE "zopkit_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text DEFAULT 'expense' NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"description" text NOT NULL,
	"category" text,
	"date" date DEFAULT now() NOT NULL,
	"time" time,
	"added_by" text DEFAULT 'self' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zopkit_transactions_amount_check" CHECK ("zopkit_transactions"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bucket_list" ADD CONSTRAINT "bucket_list_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_transactions" ADD CONSTRAINT "credit_card_transactions_credit_card_id_credit_cards_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_transactions" ADD CONSTRAINT "credit_card_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_transactions" ADD CONSTRAINT "credit_card_transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_transactions" ADD CONSTRAINT "credit_card_transactions_linked_transaction_id_transactions_id_fk" FOREIGN KEY ("linked_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lend_borrow" ADD CONSTRAINT "lend_borrow_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lend_borrow" ADD CONSTRAINT "lend_borrow_from_account_id_accounts_id_fk" FOREIGN KEY ("from_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lend_borrow" ADD CONSTRAINT "lend_borrow_linked_transaction_id_transactions_id_fk" FOREIGN KEY ("linked_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lend_repayments" ADD CONSTRAINT "lend_repayments_lend_borrow_id_lend_borrow_id_fk" FOREIGN KEY ("lend_borrow_id") REFERENCES "public"."lend_borrow"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lend_repayments" ADD CONSTRAINT "lend_repayments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lend_repayments" ADD CONSTRAINT "lend_repayments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lend_repayments" ADD CONSTRAINT "lend_repayments_linked_transaction_id_transactions_id_fk" FOREIGN KEY ("linked_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_linked_transaction_id_transactions_id_fk" FOREIGN KEY ("linked_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_paid_from_account_id_accounts_id_fk" FOREIGN KEY ("paid_from_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_rules" ADD CONSTRAINT "money_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_demat_account_id_accounts_id_fk" FOREIGN KEY ("demat_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholarship_payments" ADD CONSTRAINT "scholarship_payments_scholarship_id_scholarships_id_fk" FOREIGN KEY ("scholarship_id") REFERENCES "public"."scholarships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholarship_payments" ADD CONSTRAINT "scholarship_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholarship_payments" ADD CONSTRAINT "scholarship_payments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholarship_payments" ADD CONSTRAINT "scholarship_payments_linked_transaction_id_transactions_id_fk" FOREIGN KEY ("linked_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_received_to_account_id_accounts_id_fk" FOREIGN KEY ("received_to_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_linked_transaction_id_transactions_id_fk" FOREIGN KEY ("linked_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sips" ADD CONSTRAINT "sips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zopkit_transactions" ADD CONSTRAINT "zopkit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bucket_user_idx" ON "bucket_list" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "budgets_user_id_idx" ON "budgets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "categories_user_id_idx" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cct_card_idx" ON "credit_card_transactions" USING btree ("credit_card_id");--> statement-breakpoint
CREATE INDEX "cct_user_idx" ON "credit_card_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_cards_user_idx" ON "credit_cards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "holdings_user_id_idx" ON "holdings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "holdings_portfolio_idx" ON "holdings" USING btree ("portfolio_id");--> statement-breakpoint
CREATE INDEX "lend_borrow_user_idx" ON "lend_borrow" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lend_repayments_lb_idx" ON "lend_repayments" USING btree ("lend_borrow_id");--> statement-breakpoint
CREATE INDEX "lend_repayments_user_idx" ON "lend_repayments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "loan_payments_loan_idx" ON "loan_payments" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "loan_payments_user_idx" ON "loan_payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "loans_user_id_idx" ON "loans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "money_rules_user_idx" ON "money_rules" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "portfolios_user_id_idx" ON "portfolios" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scholarship_payments_scholarship_idx" ON "scholarship_payments" USING btree ("scholarship_id");--> statement-breakpoint
CREATE INDEX "scholarship_payments_user_idx" ON "scholarship_payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scholarships_user_idx" ON "scholarships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sips_user_id_idx" ON "sips" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_user_date_idx" ON "transactions" USING btree ("user_id","date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "transactions_user_account_idx" ON "transactions" USING btree ("user_id","account_id");--> statement-breakpoint
CREATE INDEX "transactions_transfer_group_idx" ON "transactions" USING btree ("transfer_group_id");--> statement-breakpoint
CREATE INDEX "zopkit_user_idx" ON "zopkit_transactions" USING btree ("user_id");