-- Run once in the Supabase SQL Editor to enable private profile photo uploads.
-- Each signed-in user can only access files stored under their own auth user ID.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'finmax-avatars',
  'finmax-avatars',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "FinMax users can read their profile photos" on storage.objects;
create policy "FinMax users can read their profile photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'finmax-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "FinMax users can upload their profile photos" on storage.objects;
create policy "FinMax users can upload their profile photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'finmax-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "FinMax users can update their profile photos" on storage.objects;
create policy "FinMax users can update their profile photos"
on storage.objects for update to authenticated
using (
  bucket_id = 'finmax-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'finmax-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "FinMax users can delete their profile photos" on storage.objects;
create policy "FinMax users can delete their profile photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'finmax-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
