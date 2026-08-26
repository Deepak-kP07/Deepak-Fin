-- Weekly/monthly financial report emails (Settings > Notifications). Both toggles default true
-- for every existing and new profile — opt-out, not opt-in, per product decision. The two
-- last_*_sent_at columns are separate from the toggle: they're system-only dedup state written
-- by the report cron routes (app/api/cron/reports/weekly, .../monthly), never by a client PATCH
-- (see lib/server/safeFields.js) — a user flipping the toggle off and back on must not let them
-- reset/spoof "already sent this period" state.
ALTER TABLE "profiles" ADD COLUMN "weekly_report_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "monthly_report_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "last_weekly_report_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "last_monthly_report_sent_at" timestamp with time zone;
