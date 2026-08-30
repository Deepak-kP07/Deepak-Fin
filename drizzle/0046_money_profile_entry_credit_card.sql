-- Lets a Money Profile entry (one-off or recurring) be funded by a credit card instead of a bank
-- account — mutually exclusive with account_id (the form only lets one be picked). The mirror
-- function below tags the resulting transaction linked_module='credit_card' instead of
-- 'money_profile' when a card is used, exactly matching how loan_payments/lend_borrow already
-- fund themselves via a card (app/api/[[...path]]/route.js), so it bumps the card's outstanding
-- balance and shows up in that card's own activity feed for free.
ALTER TABLE public.money_profile_entries ADD COLUMN credit_card_id uuid REFERENCES public.credit_cards(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE public.recurring_money_profile_entries ADD COLUMN credit_card_id uuid REFERENCES public.credit_cards(id) ON DELETE SET NULL;
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
  v_old_module text;
  v_old_module_id uuid;
  v_old_amount numeric;
  v_old_type text;
  v_new_module text;
  v_new_module_id uuid;
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

  -- Snapshot whatever the CURRENT mirrored transaction says before touching anything, so a
  -- funding-source change (account -> card, card -> a different card, or card -> account) can
  -- reverse the old card side effect before applying the new one — same reverse-then-reapply
  -- shape as the plain-transactions PATCH path in app/api/[[...path]]/route.js.
  IF v_entry.linked_transaction_id IS NOT NULL THEN
    SELECT linked_module, linked_module_id, amount, type INTO v_old_module, v_old_module_id, v_old_amount, v_old_type
    FROM public.transactions WHERE id = v_entry.linked_transaction_id;
  END IF;

  -- Handled first (and independent of whether an account/card currently applies) so a delete
  -- always reverses and cleans up correctly, even for an entry whose funding got cleared after
  -- its mirrored transaction was created.
  IF p_action = 'delete' THEN
    IF v_old_module = 'credit_card' AND v_old_module_id IS NOT NULL THEN
      PERFORM public.adjust_credit_card_outstanding(v_old_module_id, CASE WHEN v_old_type = 'income' THEN v_old_amount ELSE -v_old_amount END);
    END IF;
    IF v_entry.linked_transaction_id IS NOT NULL THEN
      DELETE FROM public.transactions WHERE id = v_entry.linked_transaction_id;
    END IF;
    RETURN NULL;
  END IF;

  -- A directly-picked credit card always wins over the account fallback chain.
  v_account_id := COALESCE(v_entry.account_id, v_profile.linked_account_id);
  IF v_entry.credit_card_id IS NULL AND v_account_id IS NULL THEN
    -- Nothing applies. If a mirrored transaction exists from when something did, remove it
    -- (reversing any card side effect first) instead of leaving it orphaned.
    IF v_entry.linked_transaction_id IS NOT NULL THEN
      IF v_old_module = 'credit_card' AND v_old_module_id IS NOT NULL THEN
        PERFORM public.adjust_credit_card_outstanding(v_old_module_id, CASE WHEN v_old_type = 'income' THEN v_old_amount ELSE -v_old_amount END);
      END IF;
      DELETE FROM public.transactions WHERE id = v_entry.linked_transaction_id;
      UPDATE public.money_profile_entries SET linked_transaction_id = NULL WHERE id = p_entry_id;
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

  IF v_entry.credit_card_id IS NOT NULL THEN
    v_new_module := 'credit_card'; v_new_module_id := v_entry.credit_card_id;
  ELSE
    v_new_module := 'money_profile'; v_new_module_id := v_entry.id;
  END IF;

  IF p_action = 'create' THEN
    INSERT INTO public.transactions (user_id, account_id, amount, type, description, date, category_id, linked_module, linked_module_id, notes)
    VALUES (v_profile.user_id, CASE WHEN v_entry.credit_card_id IS NOT NULL THEN NULL ELSE v_account_id END, v_entry.amount, v_direction::transaction_type, v_entry.description, v_entry.date, v_category_id, v_new_module, v_new_module_id, v_entry.notes)
    RETURNING id INTO v_tx_id;
    UPDATE public.money_profile_entries SET linked_transaction_id = v_tx_id WHERE id = p_entry_id;
    IF v_entry.credit_card_id IS NOT NULL THEN
      PERFORM public.adjust_credit_card_outstanding(v_entry.credit_card_id, CASE WHEN v_direction = 'income' THEN -v_entry.amount ELSE v_entry.amount END);
    END IF;
    RETURN v_tx_id;
  ELSIF p_action = 'update' THEN
    IF v_entry.linked_transaction_id IS NULL THEN
      -- No mirrored transaction exists yet (the entry had no applicable funding when it was
      -- created) — if one applies now, create it instead of silently doing nothing.
      INSERT INTO public.transactions (user_id, account_id, amount, type, description, date, category_id, linked_module, linked_module_id, notes)
      VALUES (v_profile.user_id, CASE WHEN v_entry.credit_card_id IS NOT NULL THEN NULL ELSE v_account_id END, v_entry.amount, v_direction::transaction_type, v_entry.description, v_entry.date, v_category_id, v_new_module, v_new_module_id, v_entry.notes)
      RETURNING id INTO v_tx_id;
      UPDATE public.money_profile_entries SET linked_transaction_id = v_tx_id WHERE id = p_entry_id;
      IF v_entry.credit_card_id IS NOT NULL THEN
        PERFORM public.adjust_credit_card_outstanding(v_entry.credit_card_id, CASE WHEN v_direction = 'income' THEN -v_entry.amount ELSE v_entry.amount END);
      END IF;
      RETURN v_tx_id;
    END IF;

    IF v_old_module = 'credit_card' AND v_old_module_id IS NOT NULL THEN
      PERFORM public.adjust_credit_card_outstanding(v_old_module_id, CASE WHEN v_old_type = 'income' THEN v_old_amount ELSE -v_old_amount END);
    END IF;

    UPDATE public.transactions SET
      account_id = CASE WHEN v_entry.credit_card_id IS NOT NULL THEN NULL ELSE v_account_id END,
      amount = v_entry.amount, type = v_direction::transaction_type, description = v_entry.description,
      date = v_entry.date, category_id = v_category_id, notes = v_entry.notes,
      linked_module = v_new_module, linked_module_id = v_new_module_id
    WHERE id = v_entry.linked_transaction_id;

    IF v_entry.credit_card_id IS NOT NULL THEN
      PERFORM public.adjust_credit_card_outstanding(v_entry.credit_card_id, CASE WHEN v_direction = 'income' THEN -v_entry.amount ELSE v_entry.amount END);
    END IF;
    RETURN v_entry.linked_transaction_id;
  END IF;
  RETURN NULL;
END;
$$;
