CREATE TABLE "budget_month_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_month_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_month_categories_month_category_key" UNIQUE("budget_month_id","category_id"),
	CONSTRAINT "budget_month_categories_amount_check" CHECK ("budget_month_categories"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "budget_months" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_months_user_year_month_key" UNIQUE("user_id","year","month"),
	CONSTRAINT "budget_months_status_check" CHECK ("budget_months"."status" in ('active','closed'))
);
--> statement-breakpoint
ALTER TABLE "budget_month_categories" ADD CONSTRAINT "budget_month_categories_budget_month_id_budget_months_id_fk" FOREIGN KEY ("budget_month_id") REFERENCES "public"."budget_months"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_month_categories" ADD CONSTRAINT "budget_month_categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_month_categories" ADD CONSTRAINT "budget_month_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_months" ADD CONSTRAINT "budget_months_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "budget_month_categories_month_idx" ON "budget_month_categories" USING btree ("budget_month_id");--> statement-breakpoint
CREATE INDEX "budget_month_categories_user_idx" ON "budget_month_categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "budget_months_user_idx" ON "budget_months" USING btree ("user_id");--> statement-breakpoint

-- RLS, same owner-only pattern as every other table (see drizzle/0001_rls_triggers_grants.sql).
-- New tables inherit INSERT/SELECT/UPDATE/DELETE grants for `authenticated` automatically via
-- that migration's `alter default privileges` clause, so no explicit grant statement is needed.
ALTER TABLE public.budget_months ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "budget_months own rows" ON public.budget_months FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
ALTER TABLE public.budget_month_categories ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "budget_month_categories own rows" ON public.budget_month_categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint

-- One-time data migration: carry any existing monthly `budgets` rows (the old per-category-only
-- shape, no overall total) into the new tables, grouped by (user, year, month derived from
-- start_date) so multiple categories in the same month land in one plan with a summed total —
-- then remove them from `budgets`, which is yearly-only from here on.
DO $$
DECLARE
  r RECORD;
  bm_id uuid;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id, extract(year from start_date)::int AS yr, (extract(month from start_date)::int - 1) AS mo
    FROM budgets WHERE period = 'monthly'
  LOOP
    INSERT INTO budget_months (user_id, year, month, total_amount, status)
    SELECT r.user_id, r.yr, r.mo, COALESCE(SUM(amount), 0), 'active'
    FROM budgets
    WHERE period = 'monthly' AND user_id = r.user_id
      AND extract(year from start_date)::int = r.yr AND (extract(month from start_date)::int - 1) = r.mo
    ON CONFLICT (user_id, year, month) DO NOTHING
    RETURNING id INTO bm_id;

    IF bm_id IS NULL THEN
      SELECT id INTO bm_id FROM budget_months WHERE user_id = r.user_id AND year = r.yr AND month = r.mo;
    END IF;

    INSERT INTO budget_month_categories (budget_month_id, user_id, category_id, amount)
    SELECT bm_id, user_id, category_id, amount FROM budgets
    WHERE period = 'monthly' AND user_id = r.user_id
      AND extract(year from start_date)::int = r.yr AND (extract(month from start_date)::int - 1) = r.mo
      AND category_id IS NOT NULL
    ON CONFLICT (budget_month_id, category_id) DO NOTHING;
  END LOOP;

  DELETE FROM budgets WHERE period = 'monthly';
END $$;