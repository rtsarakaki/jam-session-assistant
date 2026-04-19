-- Shared song catalog used by Songs/Repertoire screens.

create table public.songs (
  id uuid not null primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  language text not null default 'en',
  lyrics_url text,
  listen_url text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint songs_title_len check (char_length(trim(title)) between 1 and 180),
  constraint songs_artist_len check (char_length(trim(artist)) between 1 and 180),
  constraint songs_language_len check (char_length(trim(language)) between 2 and 32),
  constraint songs_lyrics_url_http check (
    lyrics_url is null
    or lyrics_url ~* '^https?://'
  ),
  constraint songs_listen_url_http check (
    listen_url is null
    or listen_url ~* '^https?://'
  )
);

comment on table public.songs is 'Global song catalog managed by authenticated users.';
comment on column public.songs.created_by is 'Profile/user who registered the song.';

create index songs_artist_title_idx on public.songs (artist, title);
create index songs_created_by_idx on public.songs (created_by);
create index songs_updated_at_idx on public.songs (updated_at desc);

create or replace function public.set_songs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger songs_set_updated_at
  before update on public.songs
  for each row
  execute procedure public.set_songs_updated_at();

alter table public.songs enable row level security;

create policy "songs_select_authenticated"
  on public.songs
  for select
  to authenticated
  using (true);

create policy "songs_insert_authenticated"
  on public.songs
  for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "songs_update_own"
  on public.songs
  for update
  to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy "songs_delete_own"
  on public.songs
  for delete
  to authenticated
  using (created_by = (select auth.uid()));

grant select, insert, update, delete on table public.songs to authenticated;
