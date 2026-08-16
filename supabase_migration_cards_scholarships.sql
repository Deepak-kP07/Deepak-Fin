-- Deepak Finance: Credit Cards + Scholarships module tables
-- Run in Supabase Dashboard > SQL Editor > New query. Safe to re-run.

create extension if not exists pgcrypto;

-- ============ CREDIT CARDS ============
create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  bank text,
  last4 text,
  credit_limit numeric(14,2) not null default 0,
  billing_date int not null default 1,
  due_date_offset int not null default 15,
  current_outstanding numeric(14,2) not null default 0,
  color text,
  created_at timestamptz not null default now()
);
create index if not exists credit_cards_user_idx on public.credit_cards(user_id);

create table if not exists public.credit_card_transactions (
  id uuid primary key default gen_random_uuid(),
  credit_card_id uuid not null references public.credit_cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  description text not null,
  category_id uuid references public.categories(id) on delete set null,
  date date not null default current_date,
  time time,
  status text not null default 'pending',
  linked_bill_payment_id uuid,
  linked_transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists cct_card_idx on public.credit_card_transactions(credit_card_id);
create index if not exists cct_user_idx on public.credit_card_transactions(user_id);

-- ============ SCHOLARSHIPS ============
create table if not exists public.scholarships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  total_amount numeric(14,2) not null default 0,
  academic_year text,
  source text,
  status text not null default 'pending',
  received_date date,
  due_date date,
  received_to_account_id uuid references public.accounts(id) on delete set null,
  amount_paid_to_college numeric(14,2) not null default 0,
  notes text,
  linked_transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists scholarships_user_idx on public.scholarships(user_id);

create table if not exists public.scholarship_payments (
  id uuid primary key default gen_random_uuid(),
  scholarship_id uuid not null references public.scholarships(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  paid_to text,
  payment_date date not null default current_date,
  account_id uuid references public.accounts(id) on delete set null,
  linked_transaction_id uuid references public.transactions(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists scholarship_payments_scholarship_idx on public.scholarship_payments(scholarship_id);
create index if not exists scholarship_payments_user_idx on public.scholarship_payments(user_id);

-- ============ RLS ============
alter table public.credit_cards enable row level security;
alter table public.credit_card_transactions enable row level security;
alter table public.scholarships enable row level security;
alter table public.scholarship_payments enable row level security;

drop policy if exists "credit_cards own rows" on public.credit_cards;
create policy "credit_cards own rows" on public.credit_cards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "cct own rows" on public.credit_card_transactions;
create policy "cct own rows" on public.credit_card_transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "scholarships own rows" on public.scholarships;
create policy "scholarships own rows" on public.scholarships for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "scholarship_payments own rows" on public.scholarship_payments;
create policy "scholarship_payments own rows" on public.scholarship_payments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
