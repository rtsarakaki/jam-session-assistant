-- Allow reading repertoire entries from followed profiles.
-- Needed for participant overlap scoring in Jam suggestions.

drop policy if exists "repertoire_songs_select_own" on public.repertoire_songs;

create policy "repertoire_songs_select_own_or_following"
  on public.repertoire_songs
  for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    or exists (
      select 1
      from public.profile_follows pf
      where pf.follower_id = (select auth.uid())
        and pf.following_id = profile_id
    )
  );
