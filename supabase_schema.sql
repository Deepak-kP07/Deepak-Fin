-- Deepak Finance: first stable data slice
-- Run this entire file once in Supabase Dashboard > SQL Editor > New query.

create extension if not exists pgcrypto;

create type public.account_type as enum ('bank', 'cash', 'credit_card', 'wallet', 'startup');
create type public.category_type as enum ('income', 'expense');
create type public.transaction_type as enum ('income', 'expense', 'transfer');
create type public.budget_period as enum ('monthly', 'yearly');

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type public.account_type not null default 'bank',
  bank_name text,
  account_number_last4 text,
  opening_balance numeric(14,2) not null default 0,
  current_balance numeric(14,2) not null default 0,
  currency text not null default 'INR',
  color text,
  icon text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type public.category_type not null,
  icon text,
  color text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, name, type)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  amount numeric(14,2) not null check (amount >= 0),
  type public.transaction_type not null,
  description text not null,
  date date not null default current_date,
  notes text,
  linked_module text,
  linked_module_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  amount numeric(14,2) not null check (amount >= 0),
  period public.budget_period not null default 'monthly',
  start_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists accounts_user_id_idx on public.accounts(user_id);
create index if not exists categories_user_id_idx on public.categories(user_id);
create index if not exists transactions_user_date_idx on public.transactions(user_id, date desc);
create index if not exists transactions_user_account_idx on public.transactions(user_id, account_id);
create index if not exists budgets_user_id_idx on public.budgets(user_id);

alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;

drop policy if exists "accounts own rows" on public.accounts;
create policy "accounts own rows" on public.accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "categories own rows" on public.categories;
create policy "categories own rows" on public.categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "transactions own rows" on public.transactions;
create policy "transactions own rows" on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "budgets own rows" on public.budgets;
create policy "budgets own rows" on public.budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.sync_account_balance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    update public.accounts set current_balance = opening_balance + coalesce((select sum(case when type = 'income' then amount when type = 'expense' then -amount else 0 end) from public.transactions where account_id = old.account_id), 0) where id = old.account_id;
    return old;
  end if;
  update public.accounts set current_balance = opening_balance + coalesce((select sum(case when type = 'income' then amount when type = 'expense' then -amount else 0 end) from public.transactions where account_id = new.account_id), 0) where id = new.account_id;
  if tg_op = 'UPDATE' and old.account_id is distinct from new.account_id then
    update public.accounts set current_balance = opening_balance + coalesce((select sum(case when type = 'income' then amount when type = 'expense' then -amount else 0 end) from public.transactions where account_id = old.account_id), 0) where id = old.account_id;
  end if;
  return new;
end;
$$;

drop trigger if exists transactions_sync_account_balance on public.transactions;
create trigger transactions_sync_account_balance after insert or update or delete on public.transactions for each row execute function public.sync_account_balance();

insert into public.categories (user_id, name, type, icon, color, is_default)
select id, name, type::public.category_type, icon, color, true
from auth.users cross join (values
  ('Salary', 'income', 'wallet', '#34d399'),
  ('Freelance', 'income', 'briefcase', '#22d3ee'),
  ('Food & dining', 'expense', 'utensils', '#fb7185'),
  ('Home', 'expense', 'home', '#f59e0b'),
  ('Investment', 'expense', 'trending-up', '#a78bfa'),
  ('Transport', 'expense', 'car', '#60a5fa')
) as defaults(name, type, icon, color)
where not exists (select 1 from public.categories c where c.user_id = auth.users.id and c.name = defaults.name and c.type = defaults.type::public.category_type);