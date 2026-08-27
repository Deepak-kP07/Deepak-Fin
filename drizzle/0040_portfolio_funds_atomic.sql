-- addPortfolioFunds/withdrawPortfolioFunds (lib/server/services/investments.js) previously did a
-- `transactions` insert and a `portfolios.cash_balance` update as two sequential, independent
-- Supabase calls — if the second failed after the first succeeded, cash_balance would silently
-- desync from what its own transaction log implies. These two functions wrap both writes in one
-- plpgsql function body (one implicit transaction: both succeed or neither does), the same
-- atomicity guarantee sync_account_balance() already gives accounts.current_balance. Security
-- invoker (not definer) — this only ever acts on the calling user's own rows, same as the RLS
-- policies already in force, so no privilege escalation is needed.

create or replace function public.add_portfolio_funds(
  p_portfolio_id uuid, p_account_id uuid, p_amount numeric, p_date date, p_time text, p_notes text
) returns numeric
language plpgsql security invoker set search_path = public as $$
declare
  v_name text;
  v_cash numeric;
begin
  select name, cash_balance into v_name, v_cash from public.portfolios where id = p_portfolio_id and user_id = auth.uid();
  if v_name is null then raise exception 'Portfolio not found'; end if;

  insert into public.transactions (user_id, account_id, amount, type, description, date, time, linked_module, linked_module_id, notes)
  values (auth.uid(), p_account_id, p_amount, 'expense', 'Funded ' || v_name, p_date, p_time::time, 'investment', p_portfolio_id, p_notes);

  update public.portfolios set cash_balance = cash_balance + p_amount where id = p_portfolio_id and user_id = auth.uid();

  return v_cash + p_amount;
end;
$$;
--> statement-breakpoint
grant execute on function public.add_portfolio_funds(uuid, uuid, numeric, date, text, text) to authenticated;
--> statement-breakpoint

create or replace function public.withdraw_portfolio_funds(
  p_portfolio_id uuid, p_account_id uuid, p_amount numeric, p_date date, p_time text, p_notes text
) returns numeric
language plpgsql security invoker set search_path = public as $$
declare
  v_name text;
  v_cash numeric;
begin
  select name, cash_balance into v_name, v_cash from public.portfolios where id = p_portfolio_id and user_id = auth.uid();
  if v_name is null then raise exception 'Portfolio not found'; end if;

  insert into public.transactions (user_id, account_id, amount, type, description, date, time, linked_module, linked_module_id, notes)
  values (auth.uid(), p_account_id, p_amount, 'income', 'Withdrawn from ' || v_name, p_date, p_time::time, 'investment', p_portfolio_id, p_notes);

  -- The friendly "only has X in cash" message is still produced by the JS caller before this
  -- ever runs (same check it already had); this UPDATE is a backstop for the rare race where
  -- cash_balance changed between that check and this call — portfolios_cash_balance_check
  -- (db/schema.js) rejects it and rolls back the insert above along with it, atomically.
  update public.portfolios set cash_balance = cash_balance - p_amount where id = p_portfolio_id and user_id = auth.uid();

  return v_cash - p_amount;
end;
$$;
--> statement-breakpoint
grant execute on function public.withdraw_portfolio_funds(uuid, uuid, numeric, date, text, text) to authenticated;
