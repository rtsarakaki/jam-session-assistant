-- Personal repertoire links: user profile <-> song catalog with proficiency level.
-- Prototype alignment:
-- - A user can only manage their own repertoire.
-- - Each song appears at most once per user repertoire.
-- - Level options: ADVANCED / LEARNING.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'repertoire_level'
      and n.nspname = 'public'
  ) then
    create type public.repertoire_level as enum ('ADVANCED', 'LEARNING');
  end if;
end;
$$;

create table public.repertoire_songs (
  id uuid not null primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete restrict,
  level public.repertoire_level not null default 'LEARNING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint repertoire_songs_unique_profile_song unique (profile_id, song_id)
);

comment on table public.repertoire_songs is 'Songs linked to each user repertoire with level (ADVANCED/LEARNING).';
comment on column public.repertoire_songs.level is 'User proficiency for this song in repertoire.';

create index repertoire_songs_profile_idx on public.repertoire_songs (profile_id);
create index repertoire_songs_song_idx on public.repertoire_songs (song_id);
create index repertoire_songs_profile_level_idx on public.repertoire_songs (profile_id, level);

create or replace function public.set_repertoire_songs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger repertoire_songs_set_updated_at
  before update on public.repertoire_songs
  for each row
  execute procedure public.set_repertoire_songs_updated_at();

alter table public.repertoire_songs enable row level security;

create policy "repertoire_songs_select_own"
  on public.repertoire_songs
  for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "repertoire_songs_insert_own"
  on public.repertoire_songs
  for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

create policy "repertoire_songs_update_own"
  on public.repertoire_songs
  for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "repertoire_songs_delete_own"
  on public.repertoire_songs
  for delete
  to authenticated
  using (profile_id = (select auth.uid()));

grant select, insert, update, delete on table public.repertoire_songs to authenticated;
