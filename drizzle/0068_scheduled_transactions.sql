-- Scheduled (future-dated) transactions. A transaction saved with a date after today is
-- 'scheduled': it shows (muted) in the Transactions list but doesn't count anywhere — not in
-- account balances, totals or charts, and none of its side effects (card outstanding, lend
-- repayment, …) run — until the user confirms it, which flips it to 'confirmed'. "Overdue" is
-- derived (scheduled with a date already passed), not stored.

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'confirmed';
DO $$ BEGIN
  ALTER TABLE public.transactions ADD CONSTRAINT transactions_status_check CHECK (status IN ('confirmed', 'scheduled'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS transactions_user_scheduled_idx ON public.transactions (user_id) WHERE status = 'scheduled';

-- Same as 0036's sync_account_balance(), with scheduled rows excluded from every sum. The trigger
-- already fires on UPDATE, so confirming (scheduled → confirmed) re-sums and the balance updates.
create or replace function public.sync_account_balance()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  bal_sum numeric(14,2);
begin
  if tg_op = 'DELETE' then
    if old.account_id is not null then
      select coalesce(sum(case
        when t.type = 'income' then t.amount
        when t.type = 'expense' then -t.amount
        when t.type = 'transfer' and t.transfer_direction = 'in' then t.amount
        when t.type = 'transfer' and t.transfer_direction = 'out' then -t.amount
        else 0 end), 0)
      into bal_sum from public.transactions t join public.accounts a on a.id = t.account_id
      where t.account_id = old.account_id and t.date >= a.opening_balance_date and t.status <> 'scheduled';
      update public.accounts set current_balance = opening_balance + bal_sum where id = old.account_id;
    end if;
    return old;
  end if;
  if new.account_id is not null then
    select coalesce(sum(case
      when t.type = 'income' then t.amount
      when t.type = 'expense' then -t.amount
      when t.type = 'transfer' and t.transfer_direction = 'in' then t.amount
      when t.type = 'transfer' and t.transfer_direction = 'out' then -t.amount
      else 0 end), 0)
    into bal_sum from public.transactions t join public.accounts a on a.id = t.account_id
    where t.account_id = new.account_id and t.date >= a.opening_balance_date and t.status <> 'scheduled';
    update public.accounts set current_balance = opening_balance + bal_sum where id = new.account_id;
  end if;
  if tg_op = 'UPDATE' and old.account_id is distinct from new.account_id and old.account_id is not null then
    select coalesce(sum(case
      when t.type = 'income' then t.amount
      when t.type = 'expense' then -t.amount
      when t.type = 'transfer' and t.transfer_direction = 'in' then t.amount
      when t.type = 'transfer' and t.transfer_direction = 'out' then -t.amount
      else 0 end), 0)
    into bal_sum from public.transactions t join public.accounts a on a.id = t.account_id
    where t.account_id = old.account_id and t.date >= a.opening_balance_date and t.status <> 'scheduled';
    update public.accounts set current_balance = opening_balance + bal_sum where id = old.account_id;
  end if;
  return new;
end;
$$;
