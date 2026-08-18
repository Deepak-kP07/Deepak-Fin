-- RLS + grants for the two new tables (recurring_transactions, transaction_edit_history),
-- following the exact same pattern as every other table in 0001_rls_triggers_grants.sql.

alter table public.recurring_transactions enable row level security;
alter table public.transaction_edit_history enable row level security;

drop policy if exists "recurring_transactions own rows" on public.recurring_transactions;
create policy "recurring_transactions own rows" on public.recurring_transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "transaction_edit_history own rows" on public.transaction_edit_history;
create policy "transaction_edit_history own rows" on public.transaction_edit_history for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on
  public.recurring_transactions,
  public.transaction_edit_history
to authenticated;

-- Private storage bucket for transaction receipts/attachments. Not public — every read goes
-- through a signed URL generated server-side after an ownership check, so raw bucket URLs are
-- useless without one. Objects are keyed "<user_id>/<transaction_id>/<filename>", and the RLS
-- policies below enforce that a user can only touch the folder matching their own auth.uid().
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

drop policy if exists "attachments own folder select" on storage.objects;
create policy "attachments own folder select" on storage.objects for select
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "attachments own folder insert" on storage.objects;
create policy "attachments own folder insert" on storage.objects for insert
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "attachments own folder delete" on storage.objects;
create policy "attachments own folder delete" on storage.objects for delete
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
