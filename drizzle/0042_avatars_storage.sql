-- Public storage bucket for profile pictures. Unlike 'attachments' (private, signed-URL-only —
-- see drizzle/0005_recurring_history_storage.sql), avatars are rendered directly via <img src>
-- in many places at once (sidebar, dashboard header, Settings) — a signed URL that expires would
-- mean re-signing on every render. Public read is fine here: an avatar photo isn't sensitive the
-- way a bank statement attachment is, and the object's own path already isn't guessable.
-- Objects are keyed "<user_id>/<filename>"; only the owning user can write/replace/delete their
-- own folder, same enforcement pattern as the attachments bucket.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Even though the bucket itself is public (unauthenticated reads never touch RLS), the storage
-- API's own upload/upsert path does an internal existence check under the caller's role before
-- deciding insert vs. update — without a SELECT policy that check has nothing to see, and the
-- whole upload comes back as a generic "row-level security policy" failure even though the
-- INSERT policy below is itself correct. attachments (0005) never hit this because uploads there
-- never use upsert:true from a fresh path.
drop policy if exists "avatars own folder select" on storage.objects;
create policy "avatars own folder select" on storage.objects for select
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars own folder insert" on storage.objects;
create policy "avatars own folder insert" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars own folder update" on storage.objects;
create policy "avatars own folder update" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars own folder delete" on storage.objects;
create policy "avatars own folder delete" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
