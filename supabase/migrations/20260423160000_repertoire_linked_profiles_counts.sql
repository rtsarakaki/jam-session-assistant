-- Aggregate: how many distinct profiles have each song in repertoire (bypasses row-level visibility).
create or replace function public.repertoire_linked_profiles_counts(p_song_ids uuid[])
returns table (song_id uuid, profile_count integer)
language sql
stable
security definer
set search_path = public
as $$
  select rs.song_id, (count(distinct rs.profile_id))::integer as profile_count
  from public.repertoire_songs rs
  where rs.song_id = any(p_song_ids)
  group by rs.song_id;
$$;

comment on function public.repertoire_linked_profiles_counts(uuid[]) is
  'Per song_id, number of distinct profiles with a repertoire row (global counts).';

revoke all on function public.repertoire_linked_profiles_counts(uuid[]) from public;
grant execute on function public.repertoire_linked_profiles_counts(uuid[]) to authenticated;
