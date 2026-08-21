ALTER TABLE "profiles" ADD COLUMN "kite_last_error" text;--> statement-breakpoint
ALTER TABLE "sips" ADD COLUMN "portfolio_id" uuid;--> statement-breakpoint
ALTER TABLE "sips" ADD CONSTRAINT "sips_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE set null ON UPDATE no action;