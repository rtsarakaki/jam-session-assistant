-- Ensure feed list RPCs return posts/comments/likers for one-way follows (author visible if you follow them),
-- regardless of subtle RLS + invoker interactions. Also align like policies if an older DB still used mutual-only checks.

-- ---- friend_feed_post_likes policies (one-way follow visibility on parent post) ----
drop policy if exists "friend_feed_post_likes_select_when_post_visible" on public.friend_feed_post_likes;
create policy "friend_feed_post_likes_select_when_post_visible"
  on public.friend_feed_post_likes
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.friend_feed_posts p
      where p.id = friend_feed_post_likes.post_id
        and (
          p.author_id = (select auth.uid())
          or exists (
            select 1
            from public.profile_follows pf
            where pf.follower_id = (select auth.uid())
              and pf.following_id = p.author_id
          )
        )
    )
  );

drop policy if exists "friend_feed_post_likes_insert_when_post_visible" on public.friend_feed_post_likes;
create policy "friend_feed_post_likes_insert_when_post_visible"
  on public.friend_feed_post_likes
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.friend_feed_posts p
      where p.id = post_id
        and (
          p.author_id = (select auth.uid())
          or exists (
            select 1
            from public.profile_follows pf
            where pf.follower_id = (select auth.uid())
              and pf.following_id = p.author_id
          )
        )
    )
  );

-- ---- Paginated feed: definer + explicit visibility (matches app copy: one-way follow) ----
create or replace function public.list_friend_feed_page(
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
  author_avatar_url text
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
    p.avatar_url
  from public.friend_feed_posts f
  join public.profiles p on p.id = f.author_id
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

-- ---- Comments batch: same visibility on parent post ----
create or replace function public.list_friend_feed_comments_for_posts(p_post_ids uuid[])
returns table (
  post_id uuid,
  id uuid,
  author_id uuid,
  body text,
  created_at timestamptz,
  author_username text,
  author_display_name text,
  author_avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.post_id,
    c.id,
    c.author_id,
    c.body,
    c.created_at,
    p.username,
    p.display_name,
    p.avatar_url
  from public.friend_feed_comments c
  join public.friend_feed_posts f on f.id = c.post_id
  join public.profiles p on p.id = c.author_id
  where c.post_id = any(p_post_ids)
  and (
    f.author_id = (select auth.uid())
    or exists (
      select 1
      from public.profile_follows pf
      where pf.follower_id = (select auth.uid())
        and pf.following_id = f.author_id
    )
  )
  order by c.post_id asc, c.created_at asc, c.id asc;
$$;

comment on function public.list_friend_feed_comments_for_posts(uuid[]) is
  'Comments for post ids where the parent post is visible (own or you follow author). Security definer.';

-- ---- Likers list: only if viewer may see the post ----
create or replace function public.list_friend_feed_post_likers(p_post_id uuid)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  liked_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    l.created_at
  from public.friend_feed_post_likes l
  join public.friend_feed_posts f on f.id = l.post_id
  join public.profiles p on p.id = l.user_id
  where l.post_id = p_post_id
  and (
    f.author_id = (select auth.uid())
    or exists (
      select 1
      from public.profile_follows pf
      where pf.follower_id = (select auth.uid())
        and pf.following_id = f.author_id
    )
  )
  order by l.created_at desc, l.user_id desc;
$$;

comment on function public.list_friend_feed_post_likers(uuid) is
  'Likers for a post when the viewer may see that post (own or follows author). Security definer.';

revoke all on function public.list_friend_feed_page(int, timestamptz, uuid) from public;
grant execute on function public.list_friend_feed_page(int, timestamptz, uuid) to authenticated;

revoke all on function public.list_friend_feed_comments_for_posts(uuid[]) from public;
grant execute on function public.list_friend_feed_comments_for_posts(uuid[]) to authenticated;

revoke all on function public.list_friend_feed_post_likers(uuid) from public;
grant execute on function public.list_friend_feed_post_likers(uuid) to authenticated;
