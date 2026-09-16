ALTER TABLE public.notification_events DROP CONSTRAINT notification_events_type_check;
--> statement-breakpoint
ALTER TABLE public.notification_events ADD CONSTRAINT notification_events_type_check
  CHECK (type in ('card_due','loan_due','recurring_generated','budget_overspend','recurring_money_profile_generated','pending_review_digest','app_update','chit_fund_due'));
