ALTER TABLE "portfolios" ADD COLUMN "color" text;--> statement-breakpoint
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_cash_balance_check" CHECK ("portfolios"."cash_balance" >= 0);