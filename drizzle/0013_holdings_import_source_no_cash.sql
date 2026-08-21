-- 'import' (bulk CSV/Excel import) joins 'kite' as a source that represents holdings you
-- already own elsewhere, not a purchase made with this portfolio's tracked cash — so, like
-- 'kite', it must not touch cash_balance. Only 'manual' (the single "+ Holding" form) means
-- "I'm buying this now with cash I've added to this portfolio."
ALTER TABLE "holdings" DROP CONSTRAINT "holdings_source_check";--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_source_check" CHECK ("holdings"."source" in ('manual','kite','import'));--> statement-breakpoint

-- Rewritten to only move cash for source = 'manual' rows. Previously every insert/delete
-- unconditionally deducted/refunded cash regardless of source — harmless for Kite sync only
-- because it immediately overwrites cash_balance from real margins data right after, but that
-- overwrite never even ran if the initial deduction underflowed a low/zero cash_balance below
-- zero, since the CHECK constraint on cash_balance rejects the insert outright (and neither
-- the bulk-import route nor the Kite sync service checked that insert's error, so it failed
-- silently). Gating on source fixes both bulk import and this latent Kite-sync failure mode at
-- the root, instead of requiring every non-purchase holdings writer to pre-fund cash first.
create or replace function public.sync_portfolio_cash()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.source = 'manual' then
      update public.portfolios set cash_balance = cash_balance + (old.qty * old.avg_buy_price)
        where id = old.portfolio_id;
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.source = 'manual' then
      update public.portfolios set cash_balance = cash_balance - (new.qty * new.avg_buy_price)
        where id = new.portfolio_id;
    end if;
    return new;
  end if;

  -- UPDATE: refund what the old row cost the old portfolio (if it was manual), then deduct
  -- what the new row costs the new portfolio (if it's manual) — correct whether this is a
  -- plain qty/price edit, a portfolio move, or (not reachable via the UI today) a source
  -- change, without needing separate branches for each case.
  if old.source = 'manual' then
    update public.portfolios set cash_balance = cash_balance + (old.qty * old.avg_buy_price)
      where id = old.portfolio_id;
  end if;
  if new.source = 'manual' then
    update public.portfolios set cash_balance = cash_balance - (new.qty * new.avg_buy_price)
      where id = new.portfolio_id;
  end if;
  return new;
end;
$$;
