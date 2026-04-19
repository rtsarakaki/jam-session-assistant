-- Jam session collaboration:
-- - allow broader read access for shared session list view
-- - add join requests with owner approval
-- - mark songs as played in session history

alter table public.jam_session_songs
  add column if not exists played_at timestamptz;

comment on column public.jam_session_songs.played_at is 'When this song was played in the jam session.';

create table if not exists public.jam_session_join_requests (
  id uuid not null primary key default gen_random_uuid(),
  session_id uuid not null references public.jam_sessions (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  constraint jam_session_join_requests_status_check check (status in ('pending', 'approved', 'rejected')),
  constraint jam_session_join_requests_unique_pending unique (session_id, requester_id, status)
);

create index if not exists jam_session_join_requests_session_idx on public.jam_session_join_requests (session_id);
create index if not exists jam_session_join_requests_requester_idx on public.jam_session_join_requests (requester_id);

create or replace function public.set_jam_session_join_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists jam_session_join_requests_set_updated_at on public.jam_session_join_requests;
create trigger jam_session_join_requests_set_updated_at
  before update on public.jam_session_join_requests
  for each row
  execute procedure public.set_jam_session_join_requests_updated_at();

alter table public.jam_session_join_requests enable row level security;

drop policy if exists "jam_sessions_select_participants" on public.jam_sessions;
drop policy if exists "jam_session_participants_select_visible_session" on public.jam_session_participants;
drop policy if exists "jam_session_songs_select_visible_session" on public.jam_session_songs;

create policy "jam_sessions_select_authenticated"
  on public.jam_sessions
  for select
  to authenticated
  using (true);

create policy "jam_session_participants_select_authenticated"
  on public.jam_session_participants
  for select
  to authenticated
  using (true);

create policy "jam_session_songs_select_authenticated"
  on public.jam_session_songs
  for select
  to authenticated
  using (true);

create policy "jam_session_join_requests_select_requester_or_owner"
  on public.jam_session_join_requests
  for select
  to authenticated
  using (
    requester_id = (select auth.uid())
    or exists (
      select 1
      from public.jam_sessions js
      where js.id = session_id
        and js.created_by = (select auth.uid())
    )
  );

create policy "jam_session_join_requests_insert_requester"
  on public.jam_session_join_requests
  for insert
  to authenticated
  with check (
    requester_id = (select auth.uid())
    and exists (select 1 from public.jam_sessions js where js.id = session_id)
  );

create policy "jam_session_join_requests_update_owner"
  on public.jam_session_join_requests
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.jam_sessions js
      where js.id = session_id
        and js.created_by = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.jam_sessions js
      where js.id = session_id
        and js.created_by = (select auth.uid())
    )
    and status in ('pending', 'approved', 'rejected')
  );

grant select, insert, update on table public.jam_session_join_requests to authenticated;
