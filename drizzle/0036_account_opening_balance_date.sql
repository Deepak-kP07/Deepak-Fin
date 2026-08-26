-- Lets someone backfill transactions dated before they started using this app (for their own
-- records/reports) without those double-counting against an account's opening_balance, which
-- already represents their real bank balance as of the date they started. The balance trigger
-- now only sums transactions dated on/after accounts.opening_balance_date.

-- 1. New column. Added with a temporary NOT NULL default so the ALTER succeeds on existing rows;
--    immediately overwritten below with a real, sensible value per account so nothing changes
--    for data that already exists (see the do-block below).
alter table public.accounts add column if not exists opening_balance_date date not null default current_date;

-- 2. Backfill existing accounts: earliest transaction on record, or account creation date if it
--    has none yet — either way, on/after that date already covers every transaction they have,
--    so current_balance is unchanged for accounts that existed before this migration.
update public.accounts a
set opening_balance_date = coalesce((select min(t.date) from public.transactions t where t.account_id = a.id), a.created_at::date)
where true;

-- 3. Same idea for money_profiles.opening_balance_date, which already existed as a column but was
--    never actually enforced (lib/moneyProfiles.js:profileTotals summed every entry regardless of
--    date) — so existing rows hold whatever date the profile happened to be created on, which
--    could exclude real backdated entries once the app starts enforcing it. Realign to each
--    profile's earliest entry (or its own creation date) before enforcement turns on.
update public.money_profiles p
set opening_balance_date = coalesce((select min(e.date) from public.money_profile_entries e where e.profile_id = p.id), p.created_at::date)
where true;

-- 4. Balance trigger, now date-filtered. Same structure as drizzle/0001_rls_triggers_grants.sql's
--    sync_account_balance(), with `and t.date >= a.opening_balance_date` added to every sum.
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
      where t.account_id = old.account_id and t.date >= a.opening_balance_date;
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
    where t.account_id = new.account_id and t.date >= a.opening_balance_date;
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
    where t.account_id = old.account_id and t.date >= a.opening_balance_date;
    update public.accounts set current_balance = opening_balance + bal_sum where id = old.account_id;
  end if;
  return new;
end;
$$;

-- 5. Changing an account's own opening_balance_date (via the Edit account form) needs the same
--    recompute the trigger above already does on transaction insert/update/delete — otherwise the
--    displayed balance wouldn't reflect the new cutoff until the next unrelated transaction write.
create or replace function public.recompute_account_balance_on_account_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  bal_sum numeric(14,2);
begin
  if new.opening_balance is distinct from old.opening_balance or new.opening_balance_date is distinct from old.opening_balance_date then
    select coalesce(sum(case
      when type = 'income' then amount
      when type = 'expense' then -amount
      when type = 'transfer' and transfer_direction = 'in' then amount
      when type = 'transfer' and transfer_direction = 'out' then -amount
      else 0 end), 0)
    into bal_sum from public.transactions where account_id = new.id and date >= new.opening_balance_date;
    new.current_balance := new.opening_balance + bal_sum;
  end if;
  return new;
end;
$$;

drop trigger if exists accounts_recompute_balance on public.accounts;
create trigger accounts_recompute_balance before update on public.accounts
for each row execute function public.recompute_account_balance_on_account_change();
