-- Jam history for recommendation signals:
-- - who participated in each jam
-- - which songs were played in each jam
-- This supports suggestion ranking favoring less-played songs.

create table if not exists public.jam_sessions (
  id uuid not null primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  status text not null default 'DONE',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jam_sessions_title_len check (char_length(trim(title)) between 1 and 180),
  constraint jam_sessions_status_check check (status in ('PLANNED', 'DONE', 'CANCELLED')),
  constraint jam_sessions_time_check check (ended_at is null or ended_at >= started_at)
);

comment on table public.jam_sessions is 'Jam session header with schedule/status and owner.';

create table if not exists public.jam_session_participants (
  id uuid not null primary key default gen_random_uuid(),
  session_id uuid not null references public.jam_sessions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jam_session_participants_unique unique (session_id, profile_id)
);

comment on table public.jam_session_participants is 'Profiles that participated in each jam session.';

create table if not exists public.jam_session_songs (
  id uuid not null primary key default gen_random_uuid(),
  session_id uuid not null references public.jam_sessions (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete restrict,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jam_session_songs_unique unique (session_id, song_id),
  constraint jam_session_songs_order_non_negative check (order_index >= 0)
);

comment on table public.jam_session_songs is 'Songs played in each jam session.';

create index if not exists jam_sessions_created_by_idx on public.jam_sessions (created_by);
create index if not exists jam_sessions_started_at_idx on public.jam_sessions (started_at desc);

create index if not exists jam_session_participants_profile_idx on public.jam_session_participants (profile_id);
create index if not exists jam_session_participants_session_idx on public.jam_session_participants (session_id);

create index if not exists jam_session_songs_song_idx on public.jam_session_songs (song_id);
create index if not exists jam_session_songs_session_idx on public.jam_session_songs (session_id);
create index if not exists jam_session_songs_song_session_idx on public.jam_session_songs (song_id, session_id);

create or replace function public.set_jam_sessions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists jam_sessions_set_updated_at on public.jam_sessions;
create trigger jam_sessions_set_updated_at
  before update on public.jam_sessions
  for each row
  execute procedure public.set_jam_sessions_updated_at();

create or replace function public.set_jam_session_participants_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists jam_session_participants_set_updated_at on public.jam_session_participants;
create trigger jam_session_participants_set_updated_at
  before update on public.jam_session_participants
  for each row
  execute procedure public.set_jam_session_participants_updated_at();

create or replace function public.set_jam_session_songs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists jam_session_songs_set_updated_at on public.jam_session_songs;
create trigger jam_session_songs_set_updated_at
  before update on public.jam_session_songs
  for each row
  execute procedure public.set_jam_session_songs_updated_at();

alter table public.jam_sessions enable row level security;
alter table public.jam_session_participants enable row level security;
alter table public.jam_session_songs enable row level security;

create policy "jam_sessions_select_participants"
  on public.jam_sessions
  for select
  to authenticated
  using (created_by = (select auth.uid()));

create policy "jam_sessions_insert_owner"
  on public.jam_sessions
  for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "jam_sessions_update_owner"
  on public.jam_sessions
  for update
  to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy "jam_sessions_delete_owner"
  on public.jam_sessions
  for delete
  to authenticated
  using (created_by = (select auth.uid()));

create policy "jam_session_participants_select_visible_session"
  on public.jam_session_participants
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.jam_sessions js
      where js.id = session_id
        and js.created_by = (select auth.uid())
    )
  );

create policy "jam_session_participants_insert_owner"
  on public.jam_session_participants
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.jam_sessions js
      where js.id = session_id
        and js.created_by = (select auth.uid())
    )
  );

create policy "jam_session_participants_update_owner"
  on public.jam_session_participants
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
  );

create policy "jam_session_participants_delete_owner"
  on public.jam_session_participants
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.jam_sessions js
      where js.id = session_id
        and js.created_by = (select auth.uid())
    )
  );

create policy "jam_session_songs_select_visible_session"
  on public.jam_session_songs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.jam_sessions js
      where js.id = session_id
        and js.created_by = (select auth.uid())
    )
  );

create policy "jam_session_songs_insert_owner"
  on public.jam_session_songs
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.jam_sessions js
      where js.id = session_id
        and js.created_by = (select auth.uid())
    )
  );

create policy "jam_session_songs_update_owner"
  on public.jam_session_songs
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
  );

create policy "jam_session_songs_delete_owner"
  on public.jam_session_songs
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.jam_sessions js
      where js.id = session_id
        and js.created_by = (select auth.uid())
    )
  );

grant select, insert, update, delete on table public.jam_sessions to authenticated;
grant select, insert, update, delete on table public.jam_session_participants to authenticated;
grant select, insert, update, delete on table public.jam_session_songs to authenticated;

-- Aggregation helper for "less played songs first" ranking.
create or replace view public.song_play_stats_for_my_jams
as
select
  s.id as song_id,
  coalesce(count(jss.id), 0)::bigint as play_count,
  max(js.started_at) as last_played_at
from public.songs s
left join public.jam_session_songs jss
  on jss.song_id = s.id
left join public.jam_sessions js
  on js.id = jss.session_id
 and js.created_by = (select auth.uid())
group by s.id;

grant select on table public.song_play_stats_for_my_jams to authenticated;
