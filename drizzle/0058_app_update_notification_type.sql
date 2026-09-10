-- Allows the daily notifications cron (app/api/cron/notifications/route.js) to record an
-- 'app_update' row through the same notification_events dedup table every other push type
-- already uses (one row per user per new deployed build id, via VERCEL_GIT_COMMIT_SHA as the
-- period_key) — entity_id is the user's own id, same trick 'pending_review_digest' already uses
-- for a notification with no natural per-row entity.
ALTER TABLE public.notification_events DROP CONSTRAINT notification_events_type_check;
--> statement-breakpoint
ALTER TABLE public.notification_events ADD CONSTRAINT notification_events_type_check
  CHECK (type in ('card_due','loan_due','recurring_generated','budget_overspend','recurring_money_profile_generated','pending_review_digest','app_update'));
