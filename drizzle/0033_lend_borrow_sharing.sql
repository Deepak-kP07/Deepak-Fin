-- Per-record sharing for Lend/Borrow — the same invite/accept/revoke shape as
-- money_profile_shares (drizzle/0029_money_profile_sharing.sql), extending RLS on lend_borrow
-- to owner-or-shared instead of owner-only, but with only two tiers ('read'/'admin') since
-- logging a repayment is a real side-effecting write (mirrors a transaction, can touch a credit
-- card's outstanding balance) that stays owner-only, never shared — lend_repayments' RLS is
-- extended for SELECT only, its write policies are untouched.

CREATE TABLE "lend_borrow_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lend_borrow_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"invited_email" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"invite_token" text NOT NULL,
	"invited_user_id" uuid,
	"invited_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "lend_borrow_shares_role_check" CHECK ("lend_borrow_shares"."role" in ('read','admin')),
	CONSTRAINT "lend_borrow_shares_status_check" CHECK ("lend_borrow_shares"."status" in ('pending','accepted','revoked','declined')),
	CONSTRAINT "lend_borrow_shares_token_key" UNIQUE("invite_token")
);
--> statement-breakpoint
ALTER TABLE "lend_borrow_shares" ADD CONSTRAINT "lend_borrow_shares_lend_borrow_id_lend_borrow_id_fk" FOREIGN KEY ("lend_borrow_id") REFERENCES "public"."lend_borrow"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lend_borrow_shares" ADD CONSTRAINT "lend_borrow_shares_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lend_borrow_shares" ADD CONSTRAINT "lend_borrow_shares_invited_user_id_users_id_fk" FOREIGN KEY ("invited_user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lend_borrow_shares" ADD CONSTRAINT "lend_borrow_shares_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lend_borrow_shares_record_idx" ON "lend_borrow_shares" USING btree ("lend_borrow_id");--> statement-breakpoint
CREATE INDEX "lend_borrow_shares_email_idx" ON "lend_borrow_shares" USING btree ("invited_email");--> statement-breakpoint
CREATE INDEX "lend_borrow_shares_invited_user_idx" ON "lend_borrow_shares" USING btree ("invited_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lend_borrow_shares_record_email_key" ON "lend_borrow_shares" USING btree ("lend_borrow_id", "invited_email") WHERE "status" in ('pending','accepted');--> statement-breakpoint

-- Resolves what a user is allowed to do on a given lend_borrow record: 'owner', an accepted
-- share's role ('read'/'admin'), or null. SECURITY DEFINER so it can read lend_borrow/
-- lend_borrow_shares directly without recursing through the RLS policies it's used inside of.
CREATE OR REPLACE FUNCTION public.user_role_on_lend_borrow(p_lend_borrow_id uuid, p_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.lend_borrow WHERE id = p_lend_borrow_id AND user_id = p_user_id) THEN 'owner'
    ELSE (
      SELECT role FROM public.lend_borrow_shares
      WHERE lend_borrow_id = p_lend_borrow_id AND invited_user_id = p_user_id AND status = 'accepted'
      LIMIT 1
    )
  END
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.user_role_on_lend_borrow(uuid, uuid) TO authenticated;
--> statement-breakpoint

-- Same real gap this closed for money_profiles: without this, an admin-tier collaborator (who
-- can UPDATE lend_borrow rows, see below) could rewrite user_id to themselves and become owner.
CREATE OR REPLACE FUNCTION public.prevent_lend_borrow_owner_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'lend_borrow.user_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS lend_borrow_prevent_owner_change ON public.lend_borrow;
--> statement-breakpoint
CREATE TRIGGER lend_borrow_prevent_owner_change BEFORE UPDATE ON public.lend_borrow
FOR EACH ROW EXECUTE FUNCTION public.prevent_lend_borrow_owner_change();
--> statement-breakpoint

-- Public preview (no auth required — same trust model as any emailed invite link) so an invite
-- landing page can show what a token is for before/without logging in.
CREATE OR REPLACE FUNCTION public.lend_borrow_share_preview(p_token text)
RETURNS TABLE(person_name text, record_type text, amount numeric, role text, invited_email text, status text, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lb.person_name, lb.type, lb.amount, s.role, s.invited_email, s.status, s.expires_at
  FROM public.lend_borrow_shares s
  JOIN public.lend_borrow lb ON lb.id = s.lend_borrow_id
  WHERE s.invite_token = p_token
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.lend_borrow_share_preview(text) TO authenticated, anon;
--> statement-breakpoint

-- ================= lend_borrow_shares RLS =================
-- New tables inherit grants for `authenticated` automatically via 0001's
-- `alter default privileges` clause, so no explicit grant statement is needed here.
ALTER TABLE public.lend_borrow_shares ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "lend_borrow_shares select" ON public.lend_borrow_shares
FOR SELECT USING (
  owner_id = auth.uid()
  OR invited_user_id = auth.uid()
  OR (status = 'pending' AND lower(invited_email) = lower(auth.email()))
  OR public.user_role_on_lend_borrow(lend_borrow_id, auth.uid()) = 'admin'
);
--> statement-breakpoint

-- Creating an invite: the owner can invite at either tier; an admin-tier collaborator can only
-- invite at read — granting admin access is reserved for the owner, same rule as
-- money_profile_shares (and symmetric with the removal rule below).
CREATE POLICY "lend_borrow_shares insert" ON public.lend_borrow_shares
FOR INSERT WITH CHECK (
  owner_id = auth.uid()
  OR (public.user_role_on_lend_borrow(lend_borrow_id, auth.uid()) = 'admin' AND role <> 'admin')
);
--> statement-breakpoint

CREATE POLICY "lend_borrow_shares update" ON public.lend_borrow_shares
FOR UPDATE USING (
  owner_id = auth.uid()
  OR (public.user_role_on_lend_borrow(lend_borrow_id, auth.uid()) = 'admin' AND role <> 'admin')
  OR invited_user_id = auth.uid()
  OR (status = 'pending' AND lower(invited_email) = lower(auth.email()))
) WITH CHECK (
  owner_id = auth.uid()
  OR (public.user_role_on_lend_borrow(lend_borrow_id, auth.uid()) = 'admin' AND role <> 'admin')
  OR invited_user_id = auth.uid()
);
--> statement-breakpoint

CREATE POLICY "lend_borrow_shares delete" ON public.lend_borrow_shares
FOR DELETE USING (owner_id = auth.uid());
--> statement-breakpoint

-- ================= lend_borrow RLS (replaces the owner-only policy from 0001) =================
DROP POLICY IF EXISTS "lend_borrow own rows" ON public.lend_borrow;
--> statement-breakpoint
CREATE POLICY "lend_borrow select owner or collaborator" ON public.lend_borrow
FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.lend_borrow_shares s
    WHERE s.lend_borrow_id = lend_borrow.id AND s.invited_user_id = auth.uid() AND s.status = 'accepted'
  )
);
--> statement-breakpoint
CREATE POLICY "lend_borrow insert owner only" ON public.lend_borrow
FOR INSERT WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint
-- Admin-tier collaborators can edit the record's fields (confirmed no update-time side effects
-- exist for this table — the mirrored transaction is only ever written at create time) but the
-- ownership-immutability trigger above stops them from rewriting user_id via this same policy.
CREATE POLICY "lend_borrow update owner or admin collaborator" ON public.lend_borrow
FOR UPDATE USING (
  auth.uid() = user_id OR public.user_role_on_lend_borrow(id, auth.uid()) = 'admin'
) WITH CHECK (
  auth.uid() = user_id OR public.user_role_on_lend_borrow(id, auth.uid()) = 'admin'
);
--> statement-breakpoint
-- Deleting the whole record stays owner-only — admins explicitly cannot, matching every other
-- "delete the container" rule in this app's sharing features.
CREATE POLICY "lend_borrow delete owner only" ON public.lend_borrow
FOR DELETE USING (auth.uid() = user_id);
--> statement-breakpoint

-- ================= lend_repayments RLS (split from the single owner-only policy in 0001) =================
-- Read access follows the parent record's share (a shared record's repayment history should be
-- visible), but write access is untouched — repayment logging is a real side-effecting flow
-- (lib/server/services/lendRepayment.js, driven through the transactions catch-all) that stays
-- owner-only regardless of tier, per this feature's explicit scope decision.
DROP POLICY IF EXISTS "lend_repayments own rows" ON public.lend_repayments;
--> statement-breakpoint
CREATE POLICY "lend_repayments select owner or collaborator" ON public.lend_repayments
FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.lend_borrow_shares s
    WHERE s.lend_borrow_id = lend_repayments.lend_borrow_id AND s.invited_user_id = auth.uid() AND s.status = 'accepted'
  )
);
--> statement-breakpoint
CREATE POLICY "lend_repayments insert owner only" ON public.lend_repayments
FOR INSERT WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint
CREATE POLICY "lend_repayments update owner only" ON public.lend_repayments
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint
CREATE POLICY "lend_repayments delete owner only" ON public.lend_repayments
FOR DELETE USING (auth.uid() = user_id);
