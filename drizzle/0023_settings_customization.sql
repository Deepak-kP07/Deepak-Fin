ALTER TABLE "accounts" ADD COLUMN "order_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "order_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "hidden_in_modules" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "module_settings" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "dashboard_widgets" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "money_profile_entries" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "money_profile_entries" ADD CONSTRAINT "money_profile_entries_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;--> statement-breakpoint

-- Backfill order_index for existing rows from creation order, per user, so nothing visually
-- reorders itself the moment this ships.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) - 1 AS rn
  FROM "accounts"
)
UPDATE "accounts" a SET order_index = ranked.rn FROM ranked WHERE ranked.id = a.id;--> statement-breakpoint

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, type ORDER BY name) - 1 AS rn
  FROM "categories"
)
UPDATE "categories" c SET order_index = ranked.rn FROM ranked WHERE ranked.id = c.id;--> statement-breakpoint

-- Backfill module_settings for every existing profile with the confirmed defaults: Credit
-- Cards/Investments/Loans stay on (matching today's always-visible behavior), everything else
-- starts off until the user opts in from Settings. Scholarships keeps whatever value it already
-- had in the column being replaced below.
UPDATE "profiles" SET module_settings = jsonb_build_object(
  'credit_cards', jsonb_build_object('enabled', true, 'order', 1),
  'investments', jsonb_build_object('enabled', true, 'order', 2),
  'loans', jsonb_build_object('enabled', true, 'order', 3),
  'family_company', jsonb_build_object('enabled', false, 'order', 4),
  'lend_borrow', jsonb_build_object('enabled', false, 'order', 5),
  'scholarships', jsonb_build_object('enabled', scholarships_enabled, 'order', 6),
  'budgets', jsonb_build_object('enabled', false, 'order', 7),
  'bucket_list', jsonb_build_object('enabled', false, 'order', 8),
  'money_rules', jsonb_build_object('enabled', false, 'order', 9),
  'insights', jsonb_build_object('enabled', false, 'order', 10)
);--> statement-breakpoint

ALTER TABLE "profiles" DROP COLUMN "scholarships_enabled";
