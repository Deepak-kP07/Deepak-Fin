-- Deepak Finance: Migration to add transfer support + fixed balance trigger
-- Run this in Supabase Dashboard > SQL Editor > New query.
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE).

-- 1. Add transfer_group_id and transfer_direction columns
alter table public.transactions add column if not exists transfer_group_id uuid;
alter table public.transactions add column if not exists transfer_direction text check (transfer_direction in ('out','in'));
create index if not exists transactions_transfer_group_idx on public.transactions(transfer_group_id);

-- 2. Fixed balance trigger that handles transfers correctly
create or replace function public.sync_account_balance()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  bal_sum numeric(14,2);
begin
  if tg_op = 'DELETE' then
    if old.account_id is not null then
      select coalesce(sum(case
        when type = 'income' then amount
        when type = 'expense' then -amount
        when type = 'transfer' and transfer_direction = 'in' then amount
        when type = 'transfer' and transfer_direction = 'out' then -amount
        else 0 end), 0)
      into bal_sum from public.transactions where account_id = old.account_id;
      update public.accounts set current_balance = opening_balance + bal_sum where id = old.account_id;
    end if;
    return old;
  end if;
  if new.account_id is not null then
    select coalesce(sum(case
      when type = 'income' then amount
      when type = 'expense' then -amount
      when type = 'transfer' and transfer_direction = 'in' then amount
      when type = 'transfer' and transfer_direction = 'out' then -amount
      else 0 end), 0)
    into bal_sum from public.transactions where account_id = new.account_id;
    update public.accounts set current_balance = opening_balance + bal_sum where id = new.account_id;
  end if;
  if tg_op = 'UPDATE' and old.account_id is distinct from new.account_id and old.account_id is not null then
    select coalesce(sum(case
      when type = 'income' then amount
      when type = 'expense' then -amount
      when type = 'transfer' and transfer_direction = 'in' then amount
      when type = 'transfer' and transfer_direction = 'out' then -amount
      else 0 end), 0)
    into bal_sum from public.transactions where account_id = old.account_id;
    update public.accounts set current_balance = opening_balance + bal_sum where id = old.account_id;
  end if;
  return new;
end;
$$;

-- 3. Recompute all account balances once so existing rows are up to date
update public.accounts a set current_balance = a.opening_balance + coalesce((
  select sum(case
    when t.type = 'income' then t.amount
    when t.type = 'expense' then -t.amount
    when t.type = 'transfer' and t.transfer_direction = 'in' then t.amount
    when t.type = 'transfer' and t.transfer_direction = 'out' then -t.amount
    else 0 end)
  from public.transactions t where t.account_id = a.id
), 0);
