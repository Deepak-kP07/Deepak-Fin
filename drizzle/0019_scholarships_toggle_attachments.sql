ALTER TABLE "profiles" ADD COLUMN "scholarships_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "scholarship_payments" ADD COLUMN "attachment_path" text;--> statement-breakpoint
ALTER TABLE "scholarship_payments" ADD COLUMN "attachment_name" text;--> statement-breakpoint
ALTER TABLE "scholarships" ADD COLUMN "attachment_path" text;--> statement-breakpoint
ALTER TABLE "scholarships" ADD COLUMN "attachment_name" text;