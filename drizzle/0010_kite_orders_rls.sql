-- RLS for the new kite_orders table, same owner-only pattern as every other table
-- (see drizzle/0001_rls_triggers_grants.sql). New tables inherit INSERT/SELECT/UPDATE/DELETE
-- grants for `authenticated` automatically via that migration's `alter default privileges`
-- clause, so no explicit grant statement is needed here.
alter table public.kite_orders enable row level security;

drop policy if exists "kite_orders own rows" on public.kite_orders;
create policy "kite_orders own rows" on public.kite_orders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
