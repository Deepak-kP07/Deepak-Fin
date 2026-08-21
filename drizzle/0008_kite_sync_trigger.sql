-- Extends sync_portfolio_cash (0007_portfolio_cash_trigger.sql) so it no longer touches
-- cash_balance for holdings sourced from a live Kite sync — those weren't paid for through
-- this app's own add_funds ledger, so debiting cash_balance for them would be wrong (and would
-- likely drive it straight past the non-negative constraint on first sync of a real portfolio).
-- Manual holdings (source = 'manual', the default) behave exactly as before, unchanged.
create or replace function public.sync_portfolio_cash()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.source = 'kite' then
      return old;
    end if;
    update public.portfolios set cash_balance = cash_balance + (old.qty * old.avg_buy_price)
      where id = old.portfolio_id;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.source = 'kite' then
      return new;
    end if;
    update public.portfolios set cash_balance = cash_balance - (new.qty * new.avg_buy_price)
      where id = new.portfolio_id;
    return new;
  end if;

  -- UPDATE
  if new.source = 'kite' and old.source = 'kite' then
    return new;
  end if;
  if old.portfolio_id is distinct from new.portfolio_id then
    if old.source = 'manual' then
      update public.portfolios set cash_balance = cash_balance + (old.qty * old.avg_buy_price)
        where id = old.portfolio_id;
    end if;
    if new.source = 'manual' then
      update public.portfolios set cash_balance = cash_balance - (new.qty * new.avg_buy_price)
        where id = new.portfolio_id;
    end if;
  elsif new.source = 'manual' and old.source = 'manual' then
    update public.portfolios
      set cash_balance = cash_balance - ((new.qty * new.avg_buy_price) - (old.qty * old.avg_buy_price))
      where id = new.portfolio_id;
  elsif new.source = 'manual' and old.source = 'kite' then
    -- switched from a Kite-owned row to manual (e.g. on unlink) — start charging its full
    -- current cost against cash_balance from this point forward.
    update public.portfolios set cash_balance = cash_balance - (new.qty * new.avg_buy_price)
      where id = new.portfolio_id;
  elsif new.source = 'kite' and old.source = 'manual' then
    -- switched from manual to Kite-owned — refund what was previously charged.
    update public.portfolios set cash_balance = cash_balance + (old.qty * old.avg_buy_price)
      where id = old.portfolio_id;
  end if;
  return new;
end;
$$;

-- Only one portfolio per user can ever be the live Kite-linked one — a hard, race-proof
-- backstop behind the app-level check in the link_kite route.
create unique index if not exists portfolios_one_kite_linked_per_user on public.portfolios (user_id) where kite_linked = true;
