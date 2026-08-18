ALTER TABLE "loan_payments" ADD COLUMN "interest_portion" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "loan_payments" ADD COLUMN "prepay_mode" text;--> statement-breakpoint
ALTER TABLE "loan_payments" ADD COLUMN "outstanding_before" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "loan_payments" ADD COLUMN "emi_before" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "emi_due_day" integer;