CREATE TABLE "money_profile_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"entry_type" text DEFAULT 'expense' NOT NULL,
	"category" text,
	"description" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"date" date DEFAULT now() NOT NULL,
	"paid_party" text,
	"notes" text,
	"linked_transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "money_profile_entries_type_check" CHECK ("money_profile_entries"."entry_type" in ('income','expense','capital')),
	CONSTRAINT "money_profile_entries_amount_check" CHECK ("money_profile_entries"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "money_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"profile_type" text DEFAULT 'family' NOT NULL,
	"linked_account_id" uuid,
	"opening_balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"opening_balance_date" date DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "money_profiles_type_check" CHECK ("money_profiles"."profile_type" in ('family','company','other'))
);
--> statement-breakpoint
ALTER TABLE "money_profile_entries" ADD CONSTRAINT "money_profile_entries_profile_id_money_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."money_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_profile_entries" ADD CONSTRAINT "money_profile_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_profile_entries" ADD CONSTRAINT "money_profile_entries_linked_transaction_id_transactions_id_fk" FOREIGN KEY ("linked_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_profiles" ADD CONSTRAINT "money_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_profiles" ADD CONSTRAINT "money_profiles_linked_account_id_accounts_id_fk" FOREIGN KEY ("linked_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "money_profile_entries_profile_idx" ON "money_profile_entries" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "money_profile_entries_user_idx" ON "money_profile_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "money_profiles_user_idx" ON "money_profiles" USING btree ("user_id");--> statement-breakpoint

-- RLS, same owner-only pattern as every other table (see drizzle/0001_rls_triggers_grants.sql).
-- New tables inherit INSERT/SELECT/UPDATE/DELETE grants for `authenticated` automatically via
-- that migration's `alter default privileges` clause, so no explicit grant statement is needed.
ALTER TABLE public.money_profiles ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "money_profiles own rows" ON public.money_profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
ALTER TABLE public.money_profile_entries ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "money_profile_entries own rows" ON public.money_profile_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);