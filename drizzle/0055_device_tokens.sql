-- FCM device tokens for native push (separate channel from push_subscriptions/Web Push — see
-- db/schema.js's comment on deviceTokens for why both exist), plus two new notification_events
-- types for triggers not covered by the existing cron checks: recurring Money Profile entries
-- generated, and a daily digest when pending_transactions rows are waiting for review.

CREATE TABLE "device_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"platform" text DEFAULT 'android' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "device_tokens_user_token_key" UNIQUE("user_id","token")
);
--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "device_tokens_user_idx" ON "device_tokens" USING btree ("user_id");
--> statement-breakpoint
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "device_tokens own rows" ON public.device_tokens FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint

ALTER TABLE public.notification_events DROP CONSTRAINT notification_events_type_check;
--> statement-breakpoint
ALTER TABLE public.notification_events ADD CONSTRAINT notification_events_type_check
  CHECK (type in ('card_due','loan_due','recurring_generated','budget_overspend','recurring_money_profile_generated','pending_review_digest'));
