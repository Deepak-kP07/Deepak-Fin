CREATE TABLE "other_investments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"purchase_value" numeric(14, 2) DEFAULT '0' NOT NULL,
	"purchase_date" date DEFAULT now() NOT NULL,
	"expected_cagr_pct" numeric(6, 2) DEFAULT '0' NOT NULL,
	"last_known_value" numeric(14, 2),
	"last_known_value_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "other_investments_category_check" CHECK ("other_investments"."category" in ('gold','silver','land','other'))
);--> statement-breakpoint
ALTER TABLE "other_investments" ADD CONSTRAINT "other_investments_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "other_investments" ADD CONSTRAINT "other_investments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "other_investments_user_id_idx" ON "other_investments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "other_investments_portfolio_idx" ON "other_investments" USING btree ("portfolio_id");--> statement-breakpoint

-- RLS, same owner-only pattern as every other table (see drizzle/0001_rls_triggers_grants.sql).
-- New tables inherit INSERT/SELECT/UPDATE/DELETE grants for `authenticated` automatically via
-- that migration's `alter default privileges` clause, so no explicit grant statement is needed.
ALTER TABLE public.other_investments ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "other_investments own rows" ON public.other_investments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
