ALTER TABLE "holdings" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolios" ADD COLUMN "kite_linked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolios" ADD COLUMN "last_kite_sync_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_source_check" CHECK ("holdings"."source" in ('manual','kite'));