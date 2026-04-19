-- Score history should count only songs actually played.
-- One song counts at most once per jam session.

create or replace view public.song_play_stats_for_my_jams
as
select
  s.id as song_id,
  coalesce(
    count(distinct case when jss.played_at is not null then jss.session_id end),
    0
  )::bigint as play_count,
  max(jss.played_at) as last_played_at
from public.songs s
left join public.jam_session_songs jss
  on jss.song_id = s.id
left join public.jam_sessions js
  on js.id = jss.session_id
 and js.created_by = (select auth.uid())
group by s.id;

grant select on table public.song_play_stats_for_my_jams to authenticated;
