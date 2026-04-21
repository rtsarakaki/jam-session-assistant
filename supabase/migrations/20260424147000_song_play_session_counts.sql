-- Global stats for catalog: how many jam sessions marked each song as played (distinct sessions).

create or replace function public.song_play_session_counts(p_song_ids uuid[])
returns table (song_id uuid, session_count integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    jss.song_id,
    (count(distinct jss.session_id))::integer as session_count
  from public.jam_session_songs jss
  where jss.song_id = any(p_song_ids)
    and jss.played_at is not null
  group by jss.song_id;
$$;

comment on function public.song_play_session_counts(uuid[]) is
  'Per song_id, number of distinct jam sessions where the song was marked as played (global).';

revoke all on function public.song_play_session_counts(uuid[]) from public;
grant execute on function public.song_play_session_counts(uuid[]) to authenticated;
