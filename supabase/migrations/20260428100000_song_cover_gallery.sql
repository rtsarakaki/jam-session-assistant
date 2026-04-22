-- User-submitted cover art cards linked to catalog songs (gallery by song or by artist).

create table public.song_cover_cards (
  id uuid not null primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  image_url text not null,
  note text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint song_cover_cards_image_url_http check (image_url ~* '^https?://'),
  constraint song_cover_cards_note_len check (note is null or char_length(trim(note)) <= 500)
);

comment on table public.song_cover_cards is
  'Cover / reference image cards for catalog songs; listable by song_id or by songs.artist.';

create index song_cover_cards_song_created_idx
  on public.song_cover_cards (song_id, created_at desc);

create index song_cover_cards_created_by_idx
  on public.song_cover_cards (created_by);

alter table public.song_cover_cards enable row level security;

create policy "song_cover_cards_select_authenticated"
  on public.song_cover_cards
  for select
  to authenticated
  using (true);

create policy "song_cover_cards_insert_own"
  on public.song_cover_cards
  for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "song_cover_cards_update_own"
  on public.song_cover_cards
  for update
  to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy "song_cover_cards_delete_own"
  on public.song_cover_cards
  for delete
  to authenticated
  using (created_by = (select auth.uid()));

grant select, insert, update, delete on table public.song_cover_cards to authenticated;
