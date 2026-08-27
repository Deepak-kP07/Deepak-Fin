-- Negative-value guardrails for numeric columns that had none: an app bug or a bad manual entry
-- could previously store e.g. a negative credit_limit or a negative holding qty with nothing to
-- stop it. Mirrors the >= 0 convention already used on transactions_amount_check/
-- budgets_amount_check — >= 0, not > 0, since zero is legitimately valid for several of these
-- (a 0% interest loan, a freshly-added SIP with no NAV yet, a bonus-share holding with avg_buy_price 0).
-- Hand-written to match this repo's convention (drizzle-kit's tracked journal stops at migration
-- 0016; everything since is a hand-written SQL file applied directly, not drizzle-kit generate).

ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_credit_limit_check" CHECK ("credit_limit" >= 0);
--> statement-breakpoint
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_current_outstanding_check" CHECK ("current_outstanding" >= 0);
--> statement-breakpoint

ALTER TABLE "holdings" ADD CONSTRAINT "holdings_qty_check" CHECK ("qty" >= 0);
--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_avg_buy_price_check" CHECK ("avg_buy_price" >= 0);
--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_current_price_check" CHECK ("current_price" >= 0);
--> statement-breakpoint

ALTER TABLE "sips" ADD CONSTRAINT "sips_monthly_amount_check" CHECK ("monthly_amount" >= 0);
--> statement-breakpoint
ALTER TABLE "sips" ADD CONSTRAINT "sips_units_held_check" CHECK ("units_held" >= 0);
--> statement-breakpoint
ALTER TABLE "sips" ADD CONSTRAINT "sips_nav_check" CHECK ("nav" >= 0);
--> statement-breakpoint
ALTER TABLE "sips" ADD CONSTRAINT "sips_current_value_check" CHECK ("current_value" >= 0);
--> statement-breakpoint

ALTER TABLE "loans" ADD CONSTRAINT "loans_principal_check" CHECK ("principal" >= 0);
--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_interest_rate_check" CHECK ("interest_rate" >= 0);
--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_tenure_months_check" CHECK ("tenure_months" >= 0);
--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_emi_amount_check" CHECK ("emi_amount" >= 0);
--> statement-breakpoint

ALTER TABLE "other_investments" ADD CONSTRAINT "other_investments_purchase_value_check" CHECK ("purchase_value" >= 0);
--> statement-breakpoint
ALTER TABLE "other_investments" ADD CONSTRAINT "other_investments_last_known_value_check" CHECK ("last_known_value" IS NULL OR "last_known_value" >= 0);
--> statement-breakpoint
ALTER TABLE "other_investments" ADD CONSTRAINT "other_investments_face_value_check" CHECK ("face_value" IS NULL OR "face_value" >= 0);
--> statement-breakpoint
ALTER TABLE "other_investments" ADD CONSTRAINT "other_investments_coupon_rate_pct_check" CHECK ("coupon_rate_pct" IS NULL OR "coupon_rate_pct" >= 0);
--> statement-breakpoint

ALTER TABLE "bucket_list" ADD CONSTRAINT "bucket_list_estimated_cost_check" CHECK ("estimated_cost" IS NULL OR "estimated_cost" >= 0);
