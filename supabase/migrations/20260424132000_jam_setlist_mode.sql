alter table public.jam_sessions
  add column if not exists jam_mode text not null default 'suggested';

alter table public.jam_sessions
  drop constraint if exists jam_sessions_mode_check;

alter table public.jam_sessions
  add constraint jam_sessions_mode_check
  check (jam_mode in ('suggested', 'setlist'));

comment on column public.jam_sessions.jam_mode is
  'Session planning mode: suggested (auto-ranked) or setlist (manual song pool).';

create table if not exists public.jam_session_setlist_choices (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.jam_sessions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint jam_session_setlist_choices_unique unique (session_id, profile_id, song_id)
);

create index if not exists jam_session_setlist_choices_session_idx
  on public.jam_session_setlist_choices (session_id, created_at desc);

alter table public.jam_session_setlist_choices enable row level security;

drop policy if exists "jam_setlist_choices_select_visible" on public.jam_session_setlist_choices;
create policy "jam_setlist_choices_select_visible"
  on public.jam_session_setlist_choices
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.jam_session_participants p
      where p.session_id = jam_session_setlist_choices.session_id
        and p.profile_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.jam_sessions s
      where s.id = jam_session_setlist_choices.session_id
        and s.created_by = (select auth.uid())
    )
  );

drop policy if exists "jam_setlist_choices_insert_own" on public.jam_session_setlist_choices;
create policy "jam_setlist_choices_insert_own"
  on public.jam_session_setlist_choices
  for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and (
      exists (
        select 1
        from public.jam_session_participants p
        where p.session_id = jam_session_setlist_choices.session_id
          and p.profile_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.jam_sessions s
        where s.id = jam_session_setlist_choices.session_id
          and s.created_by = (select auth.uid())
      )
    )
  );

comment on table public.jam_session_setlist_choices is
  'Song choices suggested by musicians while building a setlist-based jam.';
