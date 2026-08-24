-- Lets a money_profiles owner (or an admin-tier collaborator) invite someone else, by email, to
-- view/edit/administer that one profile — the first non-owner-only RLS in this app. Every other
-- table stays exactly as it was; only money_profiles/money_profile_entries gain an "or shared
-- with me" branch, backed by the new money_profile_shares table below.

CREATE TABLE "money_profile_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
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
	CONSTRAINT "money_profile_shares_role_check" CHECK ("money_profile_shares"."role" in ('read','edit','admin')),
	CONSTRAINT "money_profile_shares_status_check" CHECK ("money_profile_shares"."status" in ('pending','accepted','revoked','declined')),
	CONSTRAINT "money_profile_shares_token_key" UNIQUE("invite_token")
);
--> statement-breakpoint
ALTER TABLE "money_profile_shares" ADD CONSTRAINT "money_profile_shares_profile_id_money_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."money_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_profile_shares" ADD CONSTRAINT "money_profile_shares_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_profile_shares" ADD CONSTRAINT "money_profile_shares_invited_user_id_users_id_fk" FOREIGN KEY ("invited_user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_profile_shares" ADD CONSTRAINT "money_profile_shares_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "money_profile_shares_profile_idx" ON "money_profile_shares" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "money_profile_shares_email_idx" ON "money_profile_shares" USING btree ("invited_email");--> statement-breakpoint
CREATE INDEX "money_profile_shares_invited_user_idx" ON "money_profile_shares" USING btree ("invited_user_id");--> statement-breakpoint
-- Partial, not blanket: re-inviting an email whose prior invite was revoked/declined is a plain
-- new insert, not an upsert branch — only one *live* (pending or accepted) invite can exist per
-- (profile, email) at a time.
CREATE UNIQUE INDEX "money_profile_shares_profile_email_key" ON "money_profile_shares" USING btree ("profile_id", "invited_email") WHERE "status" in ('pending','accepted');--> statement-breakpoint

-- Resolves what a user is allowed to do on a given profile: 'owner' (money_profiles.user_id
-- match), an accepted share's role ('read'/'edit'/'admin'), or null (no relationship at all).
-- SECURITY DEFINER so it can read money_profiles/money_profile_shares directly without
-- recursing back through the very RLS policies it's used inside of below.
CREATE OR REPLACE FUNCTION public.user_role_on_profile(p_profile_id uuid, p_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.money_profiles WHERE id = p_profile_id AND user_id = p_user_id) THEN 'owner'
    ELSE (
      SELECT role FROM public.money_profile_shares
      WHERE profile_id = p_profile_id AND invited_user_id = p_user_id AND status = 'accepted'
      LIMIT 1
    )
  END
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.user_role_on_profile(uuid, uuid) TO authenticated;
--> statement-breakpoint

-- Prevents an admin-tier collaborator (who can UPDATE money_profiles rows, see below) from
-- rewriting user_id to themselves and silently becoming the owner. RLS's WITH CHECK alone can't
-- express "this column must not change" against the pre-update row, so this is a trigger instead.
CREATE OR REPLACE FUNCTION public.prevent_money_profile_owner_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'money_profiles.user_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS money_profiles_prevent_owner_change ON public.money_profiles;
--> statement-breakpoint
CREATE TRIGGER money_profiles_prevent_owner_change BEFORE UPDATE ON public.money_profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_money_profile_owner_change();
--> statement-breakpoint

-- Same idea for entries: an edit/admin-tier collaborator can UPDATE money_profile_entries rows,
-- but must never be able to move an entry to a different profile_id (e.g. one they have no
-- rights on at all) via that same UPDATE.
CREATE OR REPLACE FUNCTION public.prevent_money_profile_entry_reassign()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.profile_id IS DISTINCT FROM OLD.profile_id THEN
    RAISE EXCEPTION 'money_profile_entries.profile_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS money_profile_entries_prevent_reassign ON public.money_profile_entries;
--> statement-breakpoint
CREATE TRIGGER money_profile_entries_prevent_reassign BEFORE UPDATE ON public.money_profile_entries
FOR EACH ROW EXECUTE FUNCTION public.prevent_money_profile_entry_reassign();
--> statement-breakpoint

-- ================= money_profile_shares RLS =================
-- New tables inherit INSERT/SELECT/UPDATE/DELETE grants for `authenticated` automatically via
-- 0001's `alter default privileges` clause, so no explicit grant statement is needed here.
ALTER TABLE public.money_profile_shares ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Visible to: the owner, an admin-tier collaborator on that profile, the matched invitee once
-- invited_user_id is set, or (before that match happens) the currently-logged-in user whose own
-- JWT email matches a still-pending invite — this last branch is what lets a not-yet-accepted
-- invite show up for someone who just signed in with the invited address.
CREATE POLICY "money_profile_shares select" ON public.money_profile_shares
FOR SELECT USING (
  owner_id = auth.uid()
  OR invited_user_id = auth.uid()
  OR (status = 'pending' AND lower(invited_email) = lower(auth.email()))
  OR public.user_role_on_profile(profile_id, auth.uid()) = 'admin'
);
--> statement-breakpoint

-- Creating an invite: the owner can invite at any tier; an admin-tier collaborator can only
-- invite at read/edit — granting admin access is reserved for the owner, mirroring the rule
-- that only the owner can remove an admin (see the UPDATE policy below).
CREATE POLICY "money_profile_shares insert" ON public.money_profile_shares
FOR INSERT WITH CHECK (
  owner_id = auth.uid()
  OR (public.user_role_on_profile(profile_id, auth.uid()) = 'admin' AND role <> 'admin')
);
--> statement-breakpoint

-- Updating a share: the owner can change/revoke anything. A non-owner admin collaborator can
-- change/revoke a read/edit-tier row, but never an admin-tier row (own-role or another admin's)
-- — checked against BOTH the pre-update row (USING, so an admin can't touch an existing
-- admin-tier row at all) and the post-update row (WITH CHECK, so an admin can't promote someone
-- to admin either). The invitee themself can always update their own still-pending row (to
-- accept/decline) even before invited_user_id is backfilled, matched by email in that case.
CREATE POLICY "money_profile_shares update" ON public.money_profile_shares
FOR UPDATE USING (
  owner_id = auth.uid()
  OR (public.user_role_on_profile(profile_id, auth.uid()) = 'admin' AND role <> 'admin')
  OR invited_user_id = auth.uid()
  OR (status = 'pending' AND lower(invited_email) = lower(auth.email()))
) WITH CHECK (
  owner_id = auth.uid()
  OR (public.user_role_on_profile(profile_id, auth.uid()) = 'admin' AND role <> 'admin')
  OR invited_user_id = auth.uid()
);
--> statement-breakpoint

-- Hard delete reserved for the owner only — revoking a share is a status update (soft delete,
-- keeps the row for the "manage access" history list), not a row delete.
CREATE POLICY "money_profile_shares delete" ON public.money_profile_shares
FOR DELETE USING (owner_id = auth.uid());
--> statement-breakpoint

-- ================= money_profiles RLS (replaces the owner-only policy from 0017) =================
DROP POLICY IF EXISTS "money_profiles own rows" ON public.money_profiles;
--> statement-breakpoint
CREATE POLICY "money_profiles select owner or collaborator" ON public.money_profiles
FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.money_profile_shares s
    WHERE s.profile_id = money_profiles.id AND s.invited_user_id = auth.uid() AND s.status = 'accepted'
  )
);
--> statement-breakpoint
CREATE POLICY "money_profiles insert owner only" ON public.money_profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint
-- Admin-tier collaborators can edit the profile itself (name/notes/status/etc) but the
-- ownership-immutability trigger above stops them from rewriting user_id via this same policy.
CREATE POLICY "money_profiles update owner or admin collaborator" ON public.money_profiles
FOR UPDATE USING (
  auth.uid() = user_id OR public.user_role_on_profile(id, auth.uid()) = 'admin'
) WITH CHECK (
  auth.uid() = user_id OR public.user_role_on_profile(id, auth.uid()) = 'admin'
);
--> statement-breakpoint
-- Deleting the whole profile stays owner-only — admins explicitly cannot, per spec.
CREATE POLICY "money_profiles delete owner only" ON public.money_profiles
FOR DELETE USING (auth.uid() = user_id);
--> statement-breakpoint

-- ================= money_profile_entries RLS (replaces the owner-only policy from 0017) =================
DROP POLICY IF EXISTS "money_profile_entries own rows" ON public.money_profile_entries;
--> statement-breakpoint
CREATE POLICY "money_profile_entries select owner or collaborator" ON public.money_profile_entries
FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.money_profile_shares s
    WHERE s.profile_id = money_profile_entries.profile_id AND s.invited_user_id = auth.uid() AND s.status = 'accepted'
  )
);
--> statement-breakpoint
-- Note: a collaborator-authored entry is written with user_id = the profile OWNER's id, not the
-- acting collaborator's own id (so it shows up correctly in the owner's own ledger/exports) — so
-- this check deliberately does not require auth.uid() = user_id on the edit/admin branch.
CREATE POLICY "money_profile_entries insert owner or edit+ collaborator" ON public.money_profile_entries
FOR INSERT WITH CHECK (
  auth.uid() = user_id OR public.user_role_on_profile(profile_id, auth.uid()) IN ('edit','admin')
);
--> statement-breakpoint
CREATE POLICY "money_profile_entries update owner or edit+ collaborator" ON public.money_profile_entries
FOR UPDATE USING (
  auth.uid() = user_id OR public.user_role_on_profile(profile_id, auth.uid()) IN ('edit','admin')
) WITH CHECK (
  auth.uid() = user_id OR public.user_role_on_profile(profile_id, auth.uid()) IN ('edit','admin')
);
--> statement-breakpoint
-- Edit-tier can add/edit entries but not delete them — deletion needs admin (or the owner).
CREATE POLICY "money_profile_entries delete owner or admin collaborator" ON public.money_profile_entries
FOR DELETE USING (
  auth.uid() = user_id OR public.user_role_on_profile(profile_id, auth.uid()) = 'admin'
);
