-- ============================================================
-- DEEPAK FINANCE — FINAL COMBINED MIGRATION
-- Run this ONCE in Supabase Dashboard > SQL Editor > New query.
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE).
-- Includes: investments, loans, bucket_list, time-of-day on
-- transactions, portfolio cash balance, profiles, and
-- lend/borrow tracking.
-- ============================================================

create extension if not exists pgcrypto;

-- ================= INVESTMENTS =================
create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  broker text not null default 'other',
  demat_account_id uuid references public.accounts(id) on delete set null,
  cash_balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);
alter table public.portfolios add column if not exists cash_balance numeric(14,2) not null default 0;
create index if not exists portfolios_user_id_idx on public.portfolios(user_id);

create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  exchange text not null default 'NSE',
  company_name text,
  qty numeric(18,4) not null default 0,
  avg_buy_price numeric(14,2) not null default 0,
  current_price numeric(14,2) not null default 0,
  last_price_updated_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists holdings_user_id_idx on public.holdings(user_id);
create index if not exists holdings_portfolio_idx on public.holdings(portfolio_id);

create table if not exists public.sips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fund_name text not null,
  folio_number text,
  monthly_amount numeric(14,2) not null default 0,
  start_date date not null default current_date,
  units_held numeric(18,4) not null default 0,
  nav numeric(14,4) not null default 0,
  current_value numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists sips_user_id_idx on public.sips(user_id);

-- ================= LOANS =================
create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  lender text,
  principal numeric(14,2) not null default 0,
  interest_rate numeric(6,3) not null default 0,
  tenure_months int not null default 0,
  emi_amount numeric(14,2) not null default 0,
  start_date date not null default current_date,
  total_interest numeric(14,2) not null default 0,
  status text not null default 'active',
  paid_from_account_id uuid references public.accounts(id) on delete set null,
  outstanding numeric(14,2) not null default 0,
  interest_saved numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists loans_user_id_idx on public.loans(user_id);

create table if not exists public.loan_payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  type text not null default 'emi',
  payment_date date not null default current_date,
  account_id uuid references public.accounts(id) on delete set null,
  interest_saved numeric(14,2),
  linked_transaction_id uuid references public.transactions(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists loan_payments_loan_idx on public.loan_payments(loan_id);
create index if not exists loan_payments_user_idx on public.loan_payments(user_id);

-- ================= BUCKET LIST =================
create table if not exists public.bucket_list (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  estimated_cost numeric(14,2) not null default 0,
  priority text not null default 'medium',
  target_date date,
  status text not null default 'wishlist',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists bucket_user_idx on public.bucket_list(user_id);

-- ================= TIME ON TRANSACTIONS =================
alter table public.transactions add column if not exists time time;

-- ================= PROFILES =================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  age int,
  avatar_url text,
  theme text not null default 'dark',
  currency text not null default 'INR',
  updated_at timestamptz not null default now()
);

-- Auto-create profile on new user signup
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

-- Backfill for existing users
insert into public.profiles (id, full_name)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- ================= LEND / BORROW =================
create table if not exists public.lend_borrow (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_name text not null,
  type text not null default 'lent',
  amount numeric(14,2) not null check (amount > 0),
  date date not null default current_date,
  due_date date,
  from_account_id uuid references public.accounts(id) on delete set null,
  reason text,
  status text not null default 'pending',
  amount_repaid numeric(14,2) not null default 0,
  notes text,
  linked_transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists lend_borrow_user_idx on public.lend_borrow(user_id);

create table if not exists public.lend_repayments (
  id uuid primary key default gen_random_uuid(),
  lend_borrow_id uuid not null references public.lend_borrow(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  date date not null default current_date,
  account_id uuid references public.accounts(id) on delete set null,
  linked_transaction_id uuid references public.transactions(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists lend_repayments_lb_idx on public.lend_repayments(lend_borrow_id);
create index if not exists lend_repayments_user_idx on public.lend_repayments(user_id);

-- ================= ROW LEVEL SECURITY =================
alter table public.portfolios enable row level security;
alter table public.holdings enable row level security;
alter table public.sips enable row level security;
alter table public.loans enable row level security;
alter table public.loan_payments enable row level security;
alter table public.bucket_list enable row level security;
alter table public.profiles enable row level security;
alter table public.lend_borrow enable row level security;
alter table public.lend_repayments enable row level security;

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
