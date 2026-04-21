-- Single append/update log for `/app/user/[id]` activities (posts, follows, jams, songs).
-- Populated by triggers + one-time backfill; read with one ordered query instead of merging sources.

create table public.user_channel_activities (
  id uuid primary key default gen_random_uuid(),
  channel_user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  sort_at timestamptz not null,
  dedupe_key text not null,
  payload jsonb not null default '{}'::jsonb,
  constraint user_channel_activities_kind_check
    check (kind in ('post', 'follow', 'jam', 'song')),
  constraint user_channel_activities_dedupe_len check (char_length(dedupe_key) between 1 and 240),
  constraint user_channel_activities_unique_dedupe unique (channel_user_id, dedupe_key)
);

comment on table public.user_channel_activities is
  'Denormalized activity stream per profile; kept in sync via triggers for channel UI.';

create index user_channel_activities_channel_sort_idx
  on public.user_channel_activities (channel_user_id, sort_at desc, id desc);

alter table public.user_channel_activities enable row level security;

create policy "user_channel_activities_select_visible"
  on public.user_channel_activities
  for select
  to authenticated
  using (
    channel_user_id = (select auth.uid())
    or kind in ('jam', 'song')
    or (
      kind = 'post'
      and public.profile_is_mutual_follow((select auth.uid()), channel_user_id)
    )
    or (
      kind = 'follow'
      and (
        channel_user_id = (select auth.uid())
        or exists (
          select 1
          from public.profile_follows pf
          where pf.follower_id = (select auth.uid())
            and pf.following_id = user_channel_activities.channel_user_id
        )
      )
    )
  );

revoke all on table public.user_channel_activities from public;
grant select on table public.user_channel_activities to authenticated;

-- ---------- Helpers: JSON fragments ----------

create or replace function public.profile_card_jsonb(p public.profiles)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_strip_nulls(
    jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'displayName', p.display_name,
      'avatarUrl', nullif(btrim(p.avatar_url), ''),
      'bio', nullif(btrim(p.bio), ''),
      'instruments', coalesce(to_jsonb(p.instruments), '[]'::jsonb)
    )
  );
$$;

-- ---------- Post ----------

create or replace function public.user_channel_activity_touch_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.user_channel_activities (channel_user_id, kind, sort_at, dedupe_key, payload)
    values (
      new.author_id,
      'post',
      new.created_at,
      'post:' || new.id::text,
      jsonb_build_object(
        'id', new.id,
        'body', new.body,
        'createdAt', new.created_at
      )
    );
    return new;
  elsif tg_op = 'UPDATE' then
    update public.user_channel_activities
    set
      sort_at = new.created_at,
      payload = jsonb_build_object(
        'id', new.id,
        'body', new.body,
        'createdAt', new.created_at
      )
    where channel_user_id = new.author_id
      and dedupe_key = 'post:' || new.id::text;
    return new;
  else
    delete from public.user_channel_activities
    where channel_user_id = old.author_id
      and dedupe_key = 'post:' || old.id::text;
    return old;
  end if;
end;
$$;

drop trigger if exists user_channel_activity_friend_feed_posts on public.friend_feed_posts;
create trigger user_channel_activity_friend_feed_posts
  after insert or update or delete on public.friend_feed_posts
  for each row
  execute procedure public.user_channel_activity_touch_post();

-- ---------- Follow ----------

create or replace function public.user_channel_activity_touch_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tgt public.profiles%rowtype;
  payload jsonb;
begin
  select * into tgt from public.profiles p where p.id = new.following_id;
  if not found then
    return new;
  end if;

  payload := jsonb_build_object(
    'followingId', new.following_id,
    'followedAt', new.created_at,
    'target', public.profile_card_jsonb(tgt)
  );

  insert into public.user_channel_activities (channel_user_id, kind, sort_at, dedupe_key, payload)
  values (
    new.follower_id,
    'follow',
    new.created_at,
    'follow:' || new.following_id::text,
    payload
  )
  on conflict (channel_user_id, dedupe_key) do update
    set sort_at = excluded.sort_at,
        payload = excluded.payload;

  return new;
end;
$$;

drop trigger if exists user_channel_activity_profile_follows on public.profile_follows;
create trigger user_channel_activity_profile_follows
  after insert or update of created_at on public.profile_follows
  for each row
  execute procedure public.user_channel_activity_touch_follow();

create or replace function public.user_channel_activity_follow_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.user_channel_activities
  where channel_user_id = old.follower_id
    and dedupe_key = 'follow:' || old.following_id::text;
  return old;
end;
$$;

drop trigger if exists user_channel_activity_profile_follows_del on public.profile_follows;
create trigger user_channel_activity_profile_follows_del
  after delete on public.profile_follows
  for each row
  execute procedure public.user_channel_activity_follow_delete();

-- ---------- Jam participation ----------

create or replace function public.user_channel_activity_touch_jam_participant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  js public.jam_sessions%rowtype;
  payload jsonb;
begin
  select * into js from public.jam_sessions j where j.id = new.session_id;
  if not found then
    return new;
  end if;

  payload := jsonb_build_object(
    'sessionId', js.id,
    'title', js.title,
    'status', js.status,
    'startedAt', js.started_at,
    'isOwner', js.created_by = new.profile_id,
    'joinedAt', new.joined_at
  );

  insert into public.user_channel_activities (channel_user_id, kind, sort_at, dedupe_key, payload)
  values (
    new.profile_id,
    'jam',
    new.joined_at,
    'jam:' || new.session_id::text,
    payload
  )
  on conflict (channel_user_id, dedupe_key) do update
    set sort_at = excluded.sort_at,
        payload = excluded.payload;

  return new;
end;
$$;

drop trigger if exists user_channel_activity_jam_participants on public.jam_session_participants;
create trigger user_channel_activity_jam_participants
  after insert or update of joined_at on public.jam_session_participants
  for each row
  execute procedure public.user_channel_activity_touch_jam_participant();

create or replace function public.user_channel_activity_jam_participant_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.user_channel_activities
  where channel_user_id = old.profile_id
    and dedupe_key = 'jam:' || old.session_id::text;
  return old;
end;
$$;

drop trigger if exists user_channel_activity_jam_participants_del on public.jam_session_participants;
create trigger user_channel_activity_jam_participants_del
  after delete on public.jam_session_participants
  for each row
  execute procedure public.user_channel_activity_jam_participant_delete();

create or replace function public.user_channel_activity_jam_session_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_channel_activities uca
  set payload =
    jsonb_set(
      jsonb_set(
        jsonb_set(uca.payload, '{title}', to_jsonb(new.title), true),
        '{status}',
        to_jsonb(new.status),
        true
      ),
      '{startedAt}',
      to_jsonb(new.started_at),
      true
    )
  where uca.kind = 'jam'
    and (uca.payload->>'sessionId')::uuid = new.id;
  return new;
end;
$$;

drop trigger if exists user_channel_activity_jam_sessions on public.jam_sessions;
create trigger user_channel_activity_jam_sessions
  after update of title, status, started_at on public.jam_sessions
  for each row
  execute procedure public.user_channel_activity_jam_session_sync();

-- ---------- Catalog song ----------

create or replace function public.user_channel_activity_touch_song()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.user_channel_activities (channel_user_id, kind, sort_at, dedupe_key, payload)
    values (
      new.created_by,
      'song',
      new.created_at,
      'song:' || new.id::text,
      jsonb_build_object(
        'id', new.id,
        'title', new.title,
        'artist', new.artist,
        'createdAt', new.created_at,
        'lyricsUrl', nullif(btrim(new.lyrics_url), ''),
        'listenUrl', nullif(btrim(new.listen_url), '')
      )
    );
    return new;
  elsif tg_op = 'UPDATE' then
    update public.user_channel_activities
    set
      sort_at = new.created_at,
      payload = jsonb_build_object(
        'id', new.id,
        'title', new.title,
        'artist', new.artist,
        'createdAt', new.created_at,
        'lyricsUrl', nullif(btrim(new.lyrics_url), ''),
        'listenUrl', nullif(btrim(new.listen_url), '')
      )
    where channel_user_id = new.created_by
      and dedupe_key = 'song:' || new.id::text;
    return new;
  else
    delete from public.user_channel_activities
    where channel_user_id = old.created_by
      and dedupe_key = 'song:' || old.id::text;
    return old;
  end if;
end;
$$;

drop trigger if exists user_channel_activity_songs on public.songs;
create trigger user_channel_activity_songs
  after insert or update or delete on public.songs
  for each row
  execute procedure public.user_channel_activity_touch_song();

-- ---------- Refresh follow targets when profile fields change ----------

create or replace function public.user_channel_activity_profiles_refresh_follow_targets()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.username is not distinct from old.username
    and new.display_name is not distinct from old.display_name
    and new.avatar_url is not distinct from old.avatar_url
    and new.bio is not distinct from old.bio
    and new.instruments is not distinct from old.instruments then
    return new;
  end if;

  update public.user_channel_activities uca
  set payload = jsonb_set(
    uca.payload,
    '{target}',
    public.profile_card_jsonb(new),
    true
  )
  where uca.kind = 'follow'
    and (uca.payload->>'followingId')::uuid = new.id;

  return new;
end;
$$;

drop trigger if exists user_channel_activity_profiles on public.profiles;
create trigger user_channel_activity_profiles
  after update on public.profiles
  for each row
  execute procedure public.user_channel_activity_profiles_refresh_follow_targets();

-- ---------- One-time backfill ----------

insert into public.user_channel_activities (channel_user_id, kind, sort_at, dedupe_key, payload)
select
  f.author_id,
  'post',
  f.created_at,
  'post:' || f.id::text,
  jsonb_build_object('id', f.id, 'body', f.body, 'createdAt', f.created_at)
from public.friend_feed_posts f
on conflict (channel_user_id, dedupe_key) do nothing;

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
on conflict (channel_user_id, dedupe_key) do nothing;

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
on conflict (channel_user_id, dedupe_key) do nothing;

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
on conflict (channel_user_id, dedupe_key) do nothing;
