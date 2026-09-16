CREATE TABLE "chit_funds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"duration_months" integer DEFAULT 0 NOT NULL,
	"monthly_contribution" numeric(14, 2) DEFAULT '0' NOT NULL,
	"start_date" date DEFAULT now() NOT NULL,
	"account_id" uuid,
	"payout_status" text DEFAULT 'not_taken' NOT NULL,
	"payout_date" date,
	"payout_amount" numeric(14, 2),
	"payout_account_id" uuid,
	"payout_linked_transaction_id" uuid,
	"payout_month" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"completed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chit_funds_duration_months_check" CHECK ("chit_funds"."duration_months" > 0),
	CONSTRAINT "chit_funds_monthly_contribution_check" CHECK ("chit_funds"."monthly_contribution" >= 0),
	CONSTRAINT "chit_funds_payout_status_check" CHECK ("chit_funds"."payout_status" in ('not_taken','taken')),
	CONSTRAINT "chit_funds_status_check" CHECK ("chit_funds"."status" in ('active','completed'))
);
--> statement-breakpoint
CREATE TABLE "chit_fund_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chit_fund_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"dividend_received" numeric(14, 2) DEFAULT '0' NOT NULL,
	"payment_date" date DEFAULT now() NOT NULL,
	"account_id" uuid,
	"linked_transaction_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chit_fund_payments_amount_check" CHECK ("chit_fund_payments"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "chit_funds" ADD CONSTRAINT "chit_funds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chit_funds" ADD CONSTRAINT "chit_funds_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chit_funds" ADD CONSTRAINT "chit_funds_payout_account_id_accounts_id_fk" FOREIGN KEY ("payout_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chit_funds" ADD CONSTRAINT "chit_funds_payout_linked_transaction_id_transactions_id_fk" FOREIGN KEY ("payout_linked_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chit_fund_payments" ADD CONSTRAINT "chit_fund_payments_chit_fund_id_chit_funds_id_fk" FOREIGN KEY ("chit_fund_id") REFERENCES "public"."chit_funds"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chit_fund_payments" ADD CONSTRAINT "chit_fund_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chit_fund_payments" ADD CONSTRAINT "chit_fund_payments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chit_fund_payments" ADD CONSTRAINT "chit_fund_payments_linked_transaction_id_transactions_id_fk" FOREIGN KEY ("linked_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "chit_funds_user_idx" ON "chit_funds" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "chit_fund_payments_fund_idx" ON "chit_fund_payments" USING btree ("chit_fund_id");
--> statement-breakpoint
CREATE INDEX "chit_fund_payments_user_idx" ON "chit_fund_payments" USING btree ("user_id");
--> statement-breakpoint

-- RLS, same owner-only pattern as every other table (see drizzle/0001_rls_triggers_grants.sql).
-- New tables inherit INSERT/SELECT/UPDATE/DELETE grants for `authenticated` automatically via
-- that migration's `alter default privileges` clause, so no explicit grant statement is needed.
ALTER TABLE public.chit_funds ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "chit_funds own rows" ON public.chit_funds FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint
ALTER TABLE public.chit_fund_payments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "chit_fund_payments own rows" ON public.chit_fund_payments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
