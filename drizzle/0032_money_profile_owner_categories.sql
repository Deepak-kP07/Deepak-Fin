-- categories keeps its normal owner-only RLS (auth.uid() = user_id) — sharing was only ever
-- extended to money_profiles/money_profile_entries, not every table a shared profile happens to
-- reference. But a collaborator genuinely needs to see (and pick from, when logging an entry)
-- the OWNER's categories for a profile they've been given access to — without this there's no
-- way to show a category name on an existing entry, or offer a category picker at all, to
-- anyone but the owner. This is the narrow, auditable read-only escalation that gap needs,
-- re-verifying the caller's authorization itself rather than trusting the app layer already did.
CREATE OR REPLACE FUNCTION public.money_profile_owner_categories(p_profile_id uuid)
RETURNS SETOF public.categories
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  IF public.user_role_on_profile(p_profile_id, auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not authorized to view this profile';
  END IF;
  SELECT user_id INTO v_owner_id FROM public.money_profiles WHERE id = p_profile_id;
  RETURN QUERY SELECT * FROM public.categories WHERE user_id = v_owner_id;
END;
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.money_profile_owner_categories(uuid) TO authenticated;
