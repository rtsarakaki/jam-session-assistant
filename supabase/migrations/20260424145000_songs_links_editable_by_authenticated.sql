-- Catalog songs: any authenticated user may update lyrics_url and listen_url.
-- Title, artist, language, and created_by may only change when the updater is the owner (created_by).

create or replace function public.enforce_songs_owner_identity_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'Cannot change song ownership';
  end if;

  if old.created_by is distinct from (select auth.uid()) then
    if new.title is distinct from old.title
      or new.artist is distinct from old.artist
      or new.language is distinct from old.language then
      raise exception 'Only the song owner can change title, artist, or language';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.enforce_songs_owner_identity_fields() is
  'Non-owners may only change lyrics_url and listen_url on public.songs.';

drop trigger if exists songs_enforce_owner_identity_fields on public.songs;
create trigger songs_enforce_owner_identity_fields
  before update on public.songs
  for each row
  execute procedure public.enforce_songs_owner_identity_fields();

drop policy if exists "songs_update_own" on public.songs;

create policy "songs_update_authenticated"
  on public.songs
  for update
  to authenticated
  using (true)
  with check (true);
