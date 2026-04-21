-- Rebuild/backfill user channel activity log from current source tables.
-- Safe for early-stage rollout: clears stale rows and repopulates canonical payloads.

delete from public.user_channel_activities;

insert into public.user_channel_activities (channel_user_id, kind, sort_at, dedupe_key, payload)
select
  f.author_id,
  'post',
  f.created_at,
  'post:' || f.id::text,
  jsonb_build_object(
    'id', f.id,
    'body', f.body,
    'createdAt', f.created_at
  )
from public.friend_feed_posts f
on conflict (channel_user_id, dedupe_key) do update
  set sort_at = excluded.sort_at,
      payload = excluded.payload;

insert into public.user_channel_activities (channel_user_id, kind, sort_at, dedupe_key, payload)
select
  pf.follower_id,
  'follow',
  pf.created_at,
  'follow:' || pf.following_id::text,
  jsonb_build_object(
    'followingId', pf.following_id,
    'followedAt', pf.created_at,
    'target', public.profile_card_jsonb(p)
  )
from public.profile_follows pf
join public.profiles p on p.id = pf.following_id
on conflict (channel_user_id, dedupe_key) do update
  set sort_at = excluded.sort_at,
      payload = excluded.payload;

insert into public.user_channel_activities (channel_user_id, kind, sort_at, dedupe_key, payload)
select
  jsp.profile_id,
  'jam',
  jsp.joined_at,
  'jam:' || jsp.session_id::text,
  jsonb_build_object(
    'sessionId', js.id,
    'title', js.title,
    'status', js.status,
    'startedAt', js.started_at,
    'isOwner', js.created_by = jsp.profile_id,
    'joinedAt', jsp.joined_at
  )
from public.jam_session_participants jsp
join public.jam_sessions js on js.id = jsp.session_id
on conflict (channel_user_id, dedupe_key) do update
  set sort_at = excluded.sort_at,
      payload = excluded.payload;

insert into public.user_channel_activities (channel_user_id, kind, sort_at, dedupe_key, payload)
select
  s.created_by,
  'song',
  s.created_at,
  'song:' || s.id::text,
  jsonb_build_object(
    'id', s.id,
    'title', s.title,
    'artist', s.artist,
    'createdAt', s.created_at,
    'lyricsUrl', nullif(btrim(s.lyrics_url), ''),
    'listenUrl', nullif(btrim(s.listen_url), '')
  )
from public.songs s
on conflict (channel_user_id, dedupe_key) do update
  set sort_at = excluded.sort_at,
      payload = excluded.payload;
