-- Songs permissions:
-- - Any authenticated user can create and edit catalog entries.
-- - Delete is allowed only when the song is not linked to repertoire.

drop policy if exists "songs_update_own" on public.songs;
drop policy if exists "songs_delete_own" on public.songs;

create or replace function public.song_has_repertoire_links(p_song_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  has_links boolean := false;
begin
  -- Repertoire table is planned for a later phase.
  if to_regclass('public.repertoire_songs') is null then
    return false;
  end if;

  execute 'select exists (select 1 from public.repertoire_songs where song_id = $1)'
    into has_links
    using p_song_id;

  return coalesce(has_links, false);
end;
$$;

create policy "songs_update_authenticated"
  on public.songs
  for update
  to authenticated
  using (true)
  with check (true);

create policy "songs_delete_unlinked_authenticated"
  on public.songs
  for delete
  to authenticated
  using (not public.song_has_repertoire_links(id));
