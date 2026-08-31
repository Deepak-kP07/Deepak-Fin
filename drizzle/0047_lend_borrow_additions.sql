-- The reverse of lend_repayments (drizzle/0000) — logging that MORE was lent/borrowed against an
-- existing lend_borrow record instead of always creating a brand-new one, so a running
-- relationship with the same person stays as one card with a full dated history. Bumps
-- lend_borrow.amount up (lib/server/services/lendAddition.js), the mirror image of how a
-- repayment bumps amount_repaid up toward it.
CREATE TABLE "lend_borrow_additions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lend_borrow_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"date" date DEFAULT now() NOT NULL,
	"account_id" uuid,
	"linked_transaction_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lend_borrow_additions_amount_check" CHECK ("lend_borrow_additions"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "lend_borrow_additions" ADD CONSTRAINT "lend_borrow_additions_lend_borrow_id_lend_borrow_id_fk" FOREIGN KEY ("lend_borrow_id") REFERENCES "public"."lend_borrow"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lend_borrow_additions" ADD CONSTRAINT "lend_borrow_additions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lend_borrow_additions" ADD CONSTRAINT "lend_borrow_additions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lend_borrow_additions" ADD CONSTRAINT "lend_borrow_additions_linked_transaction_id_transactions_id_fk" FOREIGN KEY ("linked_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lend_borrow_additions_lb_idx" ON "lend_borrow_additions" USING btree ("lend_borrow_id");--> statement-breakpoint
CREATE INDEX "lend_borrow_additions_user_idx" ON "lend_borrow_additions" USING btree ("user_id");--> statement-breakpoint

-- RLS: same read-follows-the-share, write-stays-owner-only split as lend_repayments got in
-- drizzle/0033_lend_borrow_sharing.sql — logging an addition is a real side-effecting write
-- (mirrors a transaction, can bump a credit card's outstanding balance) reserved for the owner
-- alone. New tables inherit INSERT/SELECT/UPDATE/DELETE grants for `authenticated` automatically
-- via drizzle/0001's `alter default privileges` clause, so no explicit grant statement is needed.
ALTER TABLE public.lend_borrow_additions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "lend_borrow_additions select owner or collaborator" ON public.lend_borrow_additions
FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.lend_borrow_shares s
    WHERE s.lend_borrow_id = lend_borrow_additions.lend_borrow_id AND s.invited_user_id = auth.uid() AND s.status = 'accepted'
  )
);
--> statement-breakpoint
CREATE POLICY "lend_borrow_additions insert owner only" ON public.lend_borrow_additions
FOR INSERT WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint
CREATE POLICY "lend_borrow_additions update owner only" ON public.lend_borrow_additions
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint
CREATE POLICY "lend_borrow_additions delete owner only" ON public.lend_borrow_additions
FOR DELETE USING (auth.uid() = user_id);
