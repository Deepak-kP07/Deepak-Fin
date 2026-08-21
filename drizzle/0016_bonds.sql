ALTER TABLE "other_investments" DROP CONSTRAINT "other_investments_category_check";--> statement-breakpoint
ALTER TABLE "other_investments" ADD COLUMN "face_value" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "other_investments" ADD COLUMN "coupon_rate_pct" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "other_investments" ADD COLUMN "maturity_date" date;--> statement-breakpoint
ALTER TABLE "other_investments" ADD COLUMN "interest_frequency" text;--> statement-breakpoint
ALTER TABLE "other_investments" ADD CONSTRAINT "other_investments_interest_frequency_check" CHECK ("other_investments"."interest_frequency" is null or "other_investments"."interest_frequency" in ('annual','semi_annual','quarterly','monthly','cumulative'));--> statement-breakpoint
ALTER TABLE "other_investments" ADD CONSTRAINT "other_investments_category_check" CHECK ("other_investments"."category" in ('gold','silver','land','bond','other'));