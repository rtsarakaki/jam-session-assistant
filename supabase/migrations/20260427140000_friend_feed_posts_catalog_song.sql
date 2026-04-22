-- Optional catalog song on friend feed posts (create/edit).

alter table public.friend_feed_posts
  add column if not exists song_id uuid references public.songs (id) on delete set null;

create index if not exists friend_feed_posts_song_id_idx
  on public.friend_feed_posts (song_id)
  where song_id is not null;

comment on column public.friend_feed_posts.song_id is
  'Optional link to a catalog song (public.songs).';

-- ---- Feed list RPCs: include song metadata ----
revoke all on function public.list_friend_feed_page(int, timestamptz, uuid) from public;
drop function if exists public.list_friend_feed_page(int, timestamptz, uuid);

create function public.list_friend_feed_page(
  p_limit int,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns table (
  id uuid,
  author_id uuid,
  body text,
  created_at timestamptz,
  author_username text,
  author_display_name text,
  author_avatar_url text,
  song_id uuid,
  song_title text,
  song_artist text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.id,
    f.author_id,
    f.body,
    f.created_at,
    p.username,
    p.display_name,
    p.avatar_url,
    f.song_id,
    s.title,
    s.artist
  from public.friend_feed_posts f
  join public.profiles p on p.id = f.author_id
  left join public.songs s on s.id = f.song_id
  where (
    p_before_created_at is null
    or (f.created_at, f.id) < (p_before_created_at, p_before_id)
  )
  and (
    f.author_id = (select auth.uid())
    or exists (
      select 1
      from public.profile_follows pf
      where pf.follower_id = (select auth.uid())
        and pf.following_id = f.author_id
    )
  )
  order by f.created_at desc, f.id desc
  limit greatest(1, least(coalesce(nullif(p_limit, 0), 30), 100));
$$;

comment on function public.list_friend_feed_page(int, timestamptz, uuid) is
  'Paginated friend feed (newest first). Security definer with explicit visibility: own posts or authors you follow.';

grant execute on function public.list_friend_feed_page(int, timestamptz, uuid) to authenticated;

revoke all on function public.list_friend_feed_top_author_page(int, timestamptz, uuid) from public;
drop function if exists public.list_friend_feed_top_author_page(int, timestamptz, uuid);

create function public.list_friend_feed_top_author_page(
  p_limit int,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns table (
  id uuid,
  author_id uuid,
  body text,
  created_at timestamptz,
  author_username text,
  author_display_name text,
  author_avatar_url text,
  song_id uuid,
  song_title text,
  song_artist text
)
language sql
stable
security definer
set search_path = public
as $$
  with top_author as (
    select f.author_id
    from public.friend_feed_posts f
    where f.author_id <> (select auth.uid())
    group by f.author_id
    order by count(*) desc, max(f.created_at) desc, f.author_id desc
    limit 1
  )
  select
    f.id,
    f.author_id,
    f.body,
    f.created_at,
    p.username,
    p.display_name,
    p.avatar_url,
    f.song_id,
    s.title,
    s.artist
  from public.friend_feed_posts f
  join top_author ta on ta.author_id = f.author_id
  join public.profiles p on p.id = f.author_id
  left join public.songs s on s.id = f.song_id
  where (
    p_before_created_at is null
    or (f.created_at, f.id) < (p_before_created_at, p_before_id)
  )
  order by f.created_at desc, f.id desc
  limit greatest(1, least(coalesce(nullif(p_limit, 0), 30), 100));
$$;

comment on function public.list_friend_feed_top_author_page(int, timestamptz, uuid) is
  'Fallback feed page (newest first) for empty feeds: posts from the most active author.';

grant execute on function public.list_friend_feed_top_author_page(int, timestamptz, uuid) to authenticated;

-- ---- User channel activity payload: optional song fields ----
create or replace function public.user_channel_activity_touch_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  st text;
  sa text;
begin
  if tg_op = 'INSERT' then
    if new.song_id is not null then
      select s.title, s.artist into st, sa
      from public.songs s
      where s.id = new.song_id
      limit 1;
    else
      st := null;
      sa := null;
    end if;

    insert into public.user_channel_activities (channel_user_id, kind, sort_at, dedupe_key, payload)
    values (
      new.author_id,
      'post',
      new.created_at,
      'post:' || new.id::text,
      jsonb_strip_nulls(
        jsonb_build_object(
          'id', new.id,
          'body', new.body,
          'createdAt', new.created_at,
          'songId', new.song_id,
          'songTitle', st,
          'songArtist', sa
        )
      )
    );
    return new;
  elsif tg_op = 'UPDATE' then
    if new.song_id is not null then
      select s.title, s.artist into st, sa
      from public.songs s
      where s.id = new.song_id
      limit 1;
    else
      st := null;
      sa := null;
    end if;

    update public.user_channel_activities
    set
      sort_at = new.created_at,
      payload = jsonb_strip_nulls(
        jsonb_build_object(
          'id', new.id,
          'body', new.body,
          'createdAt', new.created_at,
          'songId', new.song_id,
          'songTitle', st,
          'songArtist', sa
        )
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
