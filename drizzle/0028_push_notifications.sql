CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_user_endpoint_key" UNIQUE("user_id","endpoint")
);
--> statement-breakpoint
CREATE TABLE "notification_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"period_key" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_events_type_check" CHECK ("notification_events"."type" in ('card_due','loan_due','recurring_generated','budget_overspend')),
	CONSTRAINT "notification_events_dedup_key" UNIQUE("user_id","type","entity_id","period_key")
);
--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_events_user_idx" ON "notification_events" USING btree ("user_id");--> statement-breakpoint

-- RLS, same owner-only pattern as every other table (see drizzle/0001_rls_triggers_grants.sql).
-- New tables inherit INSERT/SELECT/UPDATE/DELETE grants for `authenticated` automatically via
-- that migration's `alter default privileges` clause, so no explicit grant statement is needed.
-- notification_events is never touched by the client (only the cron route's service-role
-- client reads/writes it) but still gets owner-only RLS for defense in depth.
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "push_subscriptions own rows" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);--> statement-breakpoint
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "notification_events own rows" ON public.notification_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
