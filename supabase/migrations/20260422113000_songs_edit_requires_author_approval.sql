-- Songs governance:
-- - Any authenticated user can create songs.
-- - Only the author can apply direct edits and delete.
-- - Non-author edits become pending requests for author approval.

drop policy if exists "songs_update_authenticated" on public.songs;
drop policy if exists "songs_delete_unlinked_authenticated" on public.songs;

create policy "songs_update_own"
  on public.songs
  for update
  to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy "songs_delete_unlinked_own"
  on public.songs
  for delete
  to authenticated
  using (
    created_by = (select auth.uid())
    and not public.song_has_repertoire_links(id)
  );

create table if not exists public.songs_edit_requests (
  id uuid not null primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  proposed_title text not null,
  proposed_artist text not null,
  proposed_language text not null,
  proposed_lyrics_url text,
  proposed_listen_url text,
  status text not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint songs_edit_requests_status_check check (status in ('pending', 'approved', 'rejected')),
  constraint songs_edit_requests_title_len check (char_length(trim(proposed_title)) between 1 and 180),
  constraint songs_edit_requests_artist_len check (char_length(trim(proposed_artist)) between 1 and 180),
  constraint songs_edit_requests_language_len check (char_length(trim(proposed_language)) between 2 and 32),
  constraint songs_edit_requests_lyrics_url_http check (
    proposed_lyrics_url is null
    or proposed_lyrics_url ~* '^https?://'
  ),
  constraint songs_edit_requests_listen_url_http check (
    proposed_listen_url is null
    or proposed_listen_url ~* '^https?://'
  )
);

comment on table public.songs_edit_requests is 'Pending edit requests for songs, reviewed by song author.';

create index if not exists songs_edit_requests_song_idx on public.songs_edit_requests (song_id);
create index if not exists songs_edit_requests_requester_idx on public.songs_edit_requests (requester_id);
create unique index if not exists songs_edit_requests_pending_unique
  on public.songs_edit_requests (song_id, requester_id)
  where status = 'pending';

create or replace function public.set_songs_edit_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists songs_edit_requests_set_updated_at on public.songs_edit_requests;
create trigger songs_edit_requests_set_updated_at
  before update on public.songs_edit_requests
  for each row
  execute procedure public.set_songs_edit_requests_updated_at();

alter table public.songs_edit_requests enable row level security;

create policy "songs_edit_requests_select_participants"
  on public.songs_edit_requests
  for select
  to authenticated
  using (
    requester_id = (select auth.uid())
    or exists (
      select 1
      from public.songs s
      where s.id = song_id
        and s.created_by = (select auth.uid())
    )
  );

create policy "songs_edit_requests_insert_non_author"
  on public.songs_edit_requests
  for insert
  to authenticated
  with check (
    requester_id = (select auth.uid())
    and exists (
      select 1
      from public.songs s
      where s.id = song_id
        and s.created_by <> (select auth.uid())
    )
  );

create policy "songs_edit_requests_update_author_review"
  on public.songs_edit_requests
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.songs s
      where s.id = song_id
        and s.created_by = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.songs s
      where s.id = song_id
        and s.created_by = (select auth.uid())
    )
    and status in ('pending', 'approved', 'rejected')
  );

grant select, insert, update on table public.songs_edit_requests to authenticated;
