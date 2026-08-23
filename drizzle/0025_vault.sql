CREATE TABLE "vault_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"item_type" text NOT NULL,
	"label" text NOT NULL,
	"bank_name" text,
	"last4" text,
	"color" text,
	"linked_account_id" uuid,
	"encrypted_payload" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vault_items_type_check" CHECK ("vault_items"."item_type" in ('bank_account','debit_card','credit_card'))
);
--> statement-breakpoint
ALTER TABLE "vault_items" ADD CONSTRAINT "vault_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_items" ADD CONSTRAINT "vault_items_linked_account_id_accounts_id_fk" FOREIGN KEY ("linked_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vault_items_user_idx" ON "vault_items" USING btree ("user_id");--> statement-breakpoint

-- RLS, same owner-only pattern as every other table (see drizzle/0001_rls_triggers_grants.sql).
-- New tables inherit INSERT/SELECT/UPDATE/DELETE grants for `authenticated` automatically via
-- that migration's `alter default privileges` clause, so no explicit grant statement is needed.
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "vault_items own rows" ON public.vault_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
