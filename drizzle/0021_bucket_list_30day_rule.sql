-- Bucket List redesign: from a wishlist (priority/status/target_date/notes) into a 30-day-rule
-- impulse-purchase tracker (image + up to 3 reasons, days-since-added computed client-side from
-- created_at). Existing rows keep their title/estimated_cost/created_at — nothing else carries
-- over since the new model has no equivalent for priority/status/target_date/notes.
ALTER TABLE "bucket_list" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "bucket_list" ADD COLUMN "reasons" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "bucket_list" ALTER COLUMN "estimated_cost" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bucket_list" ALTER COLUMN "estimated_cost" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bucket_list" DROP COLUMN "priority";--> statement-breakpoint
ALTER TABLE "bucket_list" DROP COLUMN "target_date";--> statement-breakpoint
ALTER TABLE "bucket_list" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "bucket_list" DROP COLUMN "notes";
