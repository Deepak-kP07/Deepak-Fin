ALTER TABLE "zopkit_transactions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "zopkit_transactions" CASCADE;--> statement-breakpoint
ALTER TABLE "money_profiles" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "money_profiles" ADD COLUMN "categories" text[] DEFAULT ARRAY['Salary','Rent','Groceries','Utilities','Other']::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "money_profiles" ADD CONSTRAINT "money_profiles_status_check" CHECK ("money_profiles"."status" in ('active','closed'));