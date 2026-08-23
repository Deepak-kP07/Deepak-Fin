-- Family/Company entries now use the same real categories table (via category_id) as every
-- other module, instead of their own separate free-text system. Every existing row's category
-- was backfilled onto category_id first (see the one-time migration script run alongside this),
-- so it's safe to drop both legacy columns here.
ALTER TABLE "money_profile_entries" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "money_profiles" DROP COLUMN "categories";
