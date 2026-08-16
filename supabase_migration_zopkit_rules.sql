-- Deepak Finance: Zopkit + Money Rules + Kite token storage
-- Run in Supabase Dashboard > SQL Editor > New query. Safe to re-run.

create extension if not exists pgcrypto;

-- Store Kite access token per-user (expires daily so must be refreshed via OAuth)
alter table public.profiles add column if not exists kite_access_token text;
alter table public.profiles add column if not exists kite_access_token_at timestamptz;

-- Zopkit transactions (startup finance space)
create table if not exists public.zopkit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'expense',
  amount numeric(14,2) not null check (amount > 0),
  description text not null,
  category text,
  date date not null default current_date,
  time time,
  added_by text not null default 'self',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists zopkit_user_idx on public.zopkit_transactions(user_id);
alter table public.zopkit_transactions enable row level security;
drop policy if exists "zopkit own rows" on public.zopkit_transactions;
create policy "zopkit own rows" on public.zopkit_transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Money rules (personal finance principles shown as dashboard reminder)
create table if not exists public.money_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rule_text text not null,
  icon text,
  order_index int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists money_rules_user_idx on public.money_rules(user_id);
alter table public.money_rules enable row level security;
drop policy if exists "money_rules own rows" on public.money_rules;
create policy "money_rules own rows" on public.money_rules for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
