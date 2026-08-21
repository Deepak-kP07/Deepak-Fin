-- Lets a holding be tagged 'gold' (Gold ETF, SGB, digital/physical gold recorded manually)
-- instead of always being lumped into the Investments page's "Equity" allocation bucket.
ALTER TABLE "holdings" ADD COLUMN "asset_type" text DEFAULT 'equity' NOT NULL;--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_asset_type_check" CHECK ("holdings"."asset_type" in ('equity','gold'));
