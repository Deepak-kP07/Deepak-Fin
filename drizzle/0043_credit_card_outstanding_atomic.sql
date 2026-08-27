-- current_outstanding was updated everywhere via a read-then-write pattern (SELECT the current
-- value in app code, add/subtract in JS, UPDATE the computed result) — the exact same class of
-- race the portfolio cash_balance fix (0040) closed: two concurrent writes to the same card can
-- read the same starting value and the slower one silently clobbers the faster one's change.
-- This single atomic UPDATE (delta applied directly in SQL, clamped at 0) replaces all ~9 call
-- sites in app/api/[[...path]]/route.js. No exception on a missing/foreign card — every call site
-- treats the outstanding-balance adjustment as a best-effort side effect of some other primary
-- action (log a spend, delete a transaction, ...) and none of them should fail outright just
-- because the card lookup comes up empty, matching the `if (card) { ... }` guards being replaced.

create or replace function public.adjust_credit_card_outstanding(p_card_id uuid, p_delta numeric)
returns numeric
language plpgsql security invoker set search_path = public as $$
declare
  v_new numeric;
begin
  update public.credit_cards
  set current_outstanding = greatest(0, current_outstanding + p_delta)
  where id = p_card_id and user_id = auth.uid()
  returning current_outstanding into v_new;

  return v_new;
end;
$$;
--> statement-breakpoint
grant execute on function public.adjust_credit_card_outstanding(uuid, numeric) to authenticated;
