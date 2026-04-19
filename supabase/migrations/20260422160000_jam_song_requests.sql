-- Audience/non-participant requests for songs in a jam session.
-- Requests increase session score ranking but do not count as played history.

create table if not exists public.jam_session_song_requests (
  id uuid not null primary key default gen_random_uuid(),
  session_id uuid not null references public.jam_sessions (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint jam_session_song_requests_unique unique (session_id, song_id, requester_id)
);

create index if not exists jam_session_song_requests_session_song_idx
  on public.jam_session_song_requests (session_id, song_id);

create index if not exists jam_session_song_requests_requester_idx
  on public.jam_session_song_requests (requester_id);

alter table public.jam_session_song_requests enable row level security;

create policy "jam_song_requests_select_authenticated"
  on public.jam_session_song_requests
  for select
  to authenticated
  using (true);

create policy "jam_song_requests_insert_authenticated"
  on public.jam_session_song_requests
  for insert
  to authenticated
  with check (requester_id = (select auth.uid()));

create policy "jam_song_requests_delete_own"
  on public.jam_session_song_requests
  for delete
  to authenticated
  using (requester_id = (select auth.uid()));

grant select, insert, delete on table public.jam_session_song_requests to authenticated;
