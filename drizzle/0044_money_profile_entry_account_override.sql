-- Per-entry account override: falls back to the profile's own linked_account_id when unset, for
-- the case where one specific entry actually went through a different account than the profile's
-- usual link (rather than requiring the whole profile to be relinked to record that).
ALTER TABLE public.money_profile_entries ADD COLUMN account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.mirror_money_profile_entry_transaction(p_entry_id uuid, p_action text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_entry public.money_profile_entries%ROWTYPE;
  v_profile public.money_profiles%ROWTYPE;
  v_role text;
  v_direction text;
  v_category_id uuid;
  v_tx_id uuid;
  v_account_id uuid;
BEGIN
  IF p_action NOT IN ('create', 'update', 'delete') THEN
    RAISE EXCEPTION 'invalid action %', p_action;
  END IF;

  SELECT * INTO v_entry FROM public.money_profile_entries WHERE id = p_entry_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'entry not found'; END IF;

  SELECT * INTO v_profile FROM public.money_profiles WHERE id = v_entry.profile_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'profile not found'; END IF;

  v_role := public.user_role_on_profile(v_entry.profile_id, auth.uid());
  IF p_action = 'delete' THEN
    IF v_role NOT IN ('owner', 'admin') THEN RAISE EXCEPTION 'not authorized to delete this entry''s mirrored transaction'; END IF;
  ELSE
    IF v_role NOT IN ('owner', 'edit', 'admin') THEN RAISE EXCEPTION 'not authorized to mirror this entry'; END IF;
  END IF;

  -- The entry's own account_id wins when set (a per-entry override); otherwise fall back to the
  -- profile's linked_account_id, exactly as this function always worked before the column existed.
  v_account_id := COALESCE(v_entry.account_id, v_profile.linked_account_id);
  IF v_account_id IS NULL THEN RETURN NULL; END IF;

  IF p_action = 'delete' THEN
    IF v_entry.linked_transaction_id IS NOT NULL THEN
      DELETE FROM public.transactions WHERE id = v_entry.linked_transaction_id;
    END IF;
    RETURN NULL;
  END IF;

  v_direction := CASE WHEN v_entry.entry_type = 'expense' THEN 'expense' ELSE 'income' END;
  v_category_id := v_entry.category_id;
  IF v_category_id IS NULL THEN
    SELECT id INTO v_category_id FROM public.categories WHERE user_id = v_profile.user_id AND name = 'Other' AND type = v_direction::category_type LIMIT 1;
    IF v_category_id IS NULL THEN
      INSERT INTO public.categories (user_id, name, type, icon, color, is_default)
      VALUES (v_profile.user_id, 'Other', v_direction::category_type, 'landmark', '#f97316', true)
      RETURNING id INTO v_category_id;
    END IF;
  END IF;

  IF p_action = 'create' THEN
    INSERT INTO public.transactions (user_id, account_id, amount, type, description, date, category_id, linked_module, linked_module_id, notes)
    VALUES (v_profile.user_id, v_account_id, v_entry.amount, v_direction::transaction_type, v_entry.description, v_entry.date, v_category_id, 'money_profile', v_entry.id, v_entry.notes)
    RETURNING id INTO v_tx_id;
    UPDATE public.money_profile_entries SET linked_transaction_id = v_tx_id WHERE id = p_entry_id;
    RETURN v_tx_id;
  ELSIF p_action = 'update' THEN
    IF v_entry.linked_transaction_id IS NULL THEN
      -- No mirrored transaction exists yet (the entry had no applicable account when it was
      -- created) — if one applies now, create it instead of silently doing nothing, so setting
      -- an account after the fact actually takes effect.
      INSERT INTO public.transactions (user_id, account_id, amount, type, description, date, category_id, linked_module, linked_module_id, notes)
      VALUES (v_profile.user_id, v_account_id, v_entry.amount, v_direction::transaction_type, v_entry.description, v_entry.date, v_category_id, 'money_profile', v_entry.id, v_entry.notes)
      RETURNING id INTO v_tx_id;
      UPDATE public.money_profile_entries SET linked_transaction_id = v_tx_id WHERE id = p_entry_id;
      RETURN v_tx_id;
    END IF;
    UPDATE public.transactions SET account_id = v_account_id, amount = v_entry.amount, type = v_direction::transaction_type, description = v_entry.description, date = v_entry.date, category_id = v_category_id, notes = v_entry.notes
    WHERE id = v_entry.linked_transaction_id;
    RETURN v_entry.linked_transaction_id;
  END IF;
  RETURN NULL;
END;
$$;
