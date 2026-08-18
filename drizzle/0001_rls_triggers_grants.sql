-- Custom migration: Row Level Security, balance/profile triggers, and role
-- grants — none of this is expressible through Drizzle's schema builder, so
-- it's tracked here as hand-written SQL alongside the generated migrations.
-- This is the Drizzle-managed successor to the old supabase_schema.sql /
-- supabase_migration_*.sql files; see PROJECT_CONTEXT.md for the history.

-- ================= ROW LEVEL SECURITY =================
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.portfolios enable row level security;
alter table public.holdings enable row level security;
alter table public.sips enable row level security;
alter table public.loans enable row level security;
alter table public.loan_payments enable row level security;
alter table public.bucket_list enable row level security;
alter table public.profiles enable row level security;
alter table public.lend_borrow enable row level security;
alter table public.lend_repayments enable row level security;
alter table public.credit_cards enable row level security;
alter table public.credit_card_transactions enable row level security;
alter table public.scholarships enable row level security;
alter table public.scholarship_payments enable row level security;
alter table public.zopkit_transactions enable row level security;
alter table public.money_rules enable row level security;

drop policy if exists "accounts own rows" on public.accounts;
create policy "accounts own rows" on public.accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "categories own rows" on public.categories;
create policy "categories own rows" on public.categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "transactions own rows" on public.transactions;
create policy "transactions own rows" on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "budgets own rows" on public.budgets;
create policy "budgets own rows" on public.budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "portfolios own rows" on public.portfolios;
create policy "portfolios own rows" on public.portfolios for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "holdings own rows" on public.holdings;
create policy "holdings own rows" on public.holdings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sips own rows" on public.sips;
create policy "sips own rows" on public.sips for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "loans own rows" on public.loans;
create policy "loans own rows" on public.loans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "loan_payments own rows" on public.loan_payments;
create policy "loan_payments own rows" on public.loan_payments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "bucket own rows" on public.bucket_list;
create policy "bucket own rows" on public.bucket_list for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "profiles own row" on public.profiles;
create policy "profiles own row" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "lend_borrow own rows" on public.lend_borrow;
create policy "lend_borrow own rows" on public.lend_borrow for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "lend_repayments own rows" on public.lend_repayments;
create policy "lend_repayments own rows" on public.lend_repayments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "credit_cards own rows" on public.credit_cards;
create policy "credit_cards own rows" on public.credit_cards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "cct own rows" on public.credit_card_transactions;
create policy "cct own rows" on public.credit_card_transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "scholarships own rows" on public.scholarships;
create policy "scholarships own rows" on public.scholarships for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "scholarship_payments own rows" on public.scholarship_payments;
create policy "scholarship_payments own rows" on public.scholarship_payments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "zopkit own rows" on public.zopkit_transactions;
create policy "zopkit own rows" on public.zopkit_transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "money_rules own rows" on public.money_rules;
create policy "money_rules own rows" on public.money_rules for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ================= TRIGGERS =================

-- Recomputes accounts.current_balance from opening_balance + all transactions
-- (income/expense/transfer) whenever a transaction is inserted, updated, or deleted.
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

drop trigger if exists transactions_sync_account_balance on public.transactions;
create trigger transactions_sync_account_balance after insert or update or delete on public.transactions
for each row execute function public.sync_account_balance();

-- Auto-creates a profiles row for every new auth.users signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ================= ROLE GRANTS =================
-- Required so PostgREST (via the anon-key session client) can see and act on
-- these tables at all — RLS then filters which rows. Without this grant,
-- writes fail with "Could not find the table '<name>' in the schema cache"
-- even though RLS policies are correct.
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on
  public.accounts,
  public.categories,
  public.transactions,
  public.budgets,
  public.portfolios,
  public.holdings,
  public.sips,
  public.loans,
  public.loan_payments,
  public.bucket_list,
  public.profiles,
  public.lend_borrow,
  public.lend_repayments,
  public.credit_cards,
  public.credit_card_transactions,
  public.scholarships,
  public.scholarship_payments,
  public.zopkit_transactions,
  public.money_rules
to authenticated;

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to authenticated;
