-- Align feed permissions with fallback visibility:
-- if a post is visible (own, follows author, or fallback top author), likes/comments must work.

create or replace function public.friend_feed_fallback_top_author_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select f.author_id
  from public.friend_feed_posts f
  where f.author_id <> (select auth.uid())
  group by f.author_id
  order by count(*) desc, max(f.created_at) desc, f.author_id desc
  limit 1
$$;

comment on function public.friend_feed_fallback_top_author_id() is
  'Current fallback author (most active by post count; tie-break: latest post, then author id).';

create or replace function public.can_view_feed_author(p_author_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    p_author_id = (select auth.uid())
    or exists (
      select 1
      from public.profile_follows pf
      where pf.follower_id = (select auth.uid())
        and pf.following_id = p_author_id
    )
    or p_author_id = public.friend_feed_fallback_top_author_id()
  );
$$;

comment on function public.can_view_feed_author(uuid) is
  'Feed visibility rule: own posts, followed authors, or current fallback top author.';

revoke all on function public.friend_feed_fallback_top_author_id() from public;
grant execute on function public.friend_feed_fallback_top_author_id() to authenticated;

revoke all on function public.can_view_feed_author(uuid) from public;
grant execute on function public.can_view_feed_author(uuid) to authenticated;

drop policy if exists "friend_feed_posts_select_follows_or_own" on public.friend_feed_posts;
create policy "friend_feed_posts_select_visible_authors"
  on public.friend_feed_posts
  for select
  to authenticated
  using (public.can_view_feed_author(author_id));

drop policy if exists "friend_feed_comments_select_when_post_visible" on public.friend_feed_comments;
create policy "friend_feed_comments_select_when_post_visible"
  on public.friend_feed_comments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.friend_feed_posts p
      where p.id = friend_feed_comments.post_id
        and public.can_view_feed_author(p.author_id)
    )
  );

drop policy if exists "friend_feed_comments_insert_when_post_visible" on public.friend_feed_comments;
create policy "friend_feed_comments_insert_when_post_visible"
  on public.friend_feed_comments
  for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1
      from public.friend_feed_posts p
      where p.id = post_id
        and public.can_view_feed_author(p.author_id)
    )
  );

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
        and public.can_view_feed_author(p.author_id)
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
        and public.can_view_feed_author(p.author_id)
    )
  );

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
    and public.can_view_feed_author(f.author_id)
  order by c.post_id asc, c.created_at asc, c.id asc;
$$;

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
    and public.can_view_feed_author(f.author_id)
  order by l.created_at desc, l.user_id desc;
$$;
