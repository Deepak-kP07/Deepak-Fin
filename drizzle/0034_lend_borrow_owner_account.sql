-- accounts keeps its own owner-only RLS (sharing was only ever extended to lend_borrow/
-- lend_repayments/lend_borrow_shares) — a collaborator's session can't SELECT the owner's
-- accounts directly, so a shared record's "funded from <account>" display would come up empty
-- for anyone but the owner. Same narrow, read-only escalation pattern as
-- money_profile_owner_categories() — deliberately returns only display fields (name/type/color/
-- icon), never balance figures, since this exists purely to label which account a record is
-- linked to, not to expose the owner's broader financial picture.
CREATE OR REPLACE FUNCTION public.lend_borrow_owner_account(p_lend_borrow_id uuid)
RETURNS TABLE(id uuid, name text, type text, color text, icon text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_account_id uuid;
BEGIN
  IF public.user_role_on_lend_borrow(p_lend_borrow_id, auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not authorized to view this record';
  END IF;
  -- Table-qualified WHERE clause: the RETURNS TABLE column named "id" above implicitly declares
  -- an "id" variable in this function's scope, so a bare "id" here would be ambiguous against it.
  SELECT lb.from_account_id INTO v_account_id FROM public.lend_borrow lb WHERE lb.id = p_lend_borrow_id;
  IF v_account_id IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT a.id, a.name, a.type::text, a.color, a.icon FROM public.accounts a WHERE a.id = v_account_id;
END;
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.lend_borrow_owner_account(uuid) TO authenticated;
