-- Keeps portfolios.cash_balance in sync with the cost basis of its holdings, the same way
-- sync_account_balance (0001_rls_triggers_grants.sql) keeps accounts.current_balance in sync
-- with its transactions — except this one is incremental, not a full recompute, since
-- cash_balance's other input (add_funds/withdraw_funds transactions) isn't something a
-- holdings-scoped trigger should reach into. Buying a holding spends cash; selling (deleting)
-- one refunds it; editing qty/avg_buy_price (or moving a holding to a different portfolio)
-- applies just the delta, which previously had no effect on cash_balance at all.
create or replace function public.sync_portfolio_cash()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    update public.portfolios set cash_balance = cash_balance + (old.qty * old.avg_buy_price)
      where id = old.portfolio_id;
    return old;
  end if;

  if tg_op = 'INSERT' then
    update public.portfolios set cash_balance = cash_balance - (new.qty * new.avg_buy_price)
      where id = new.portfolio_id;
    return new;
  end if;

  -- UPDATE: if the holding moved to a different portfolio, refund the old one in full and
  -- deduct the new one in full; otherwise just apply the qty/price delta to the one portfolio.
  if old.portfolio_id is distinct from new.portfolio_id then
    update public.portfolios set cash_balance = cash_balance + (old.qty * old.avg_buy_price)
      where id = old.portfolio_id;
    update public.portfolios set cash_balance = cash_balance - (new.qty * new.avg_buy_price)
      where id = new.portfolio_id;
  else
    update public.portfolios
      set cash_balance = cash_balance - ((new.qty * new.avg_buy_price) - (old.qty * old.avg_buy_price))
      where id = new.portfolio_id;
  end if;
  return new;
end;
$$;

drop trigger if exists holdings_sync_portfolio_cash on public.holdings;
create trigger holdings_sync_portfolio_cash after insert or update or delete on public.holdings
for each row execute function public.sync_portfolio_cash();
