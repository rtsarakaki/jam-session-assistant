-- Feed fallback when user has no visible posts:
-- return posts from the most active author (highest number of feed posts).

create or replace function public.list_friend_feed_top_author_page(
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
    p.avatar_url
  from public.friend_feed_posts f
  join top_author ta on ta.author_id = f.author_id
  join public.profiles p on p.id = f.author_id
  where (
    p_before_created_at is null
    or (f.created_at, f.id) < (p_before_created_at, p_before_id)
  )
  order by f.created_at desc, f.id desc
  limit greatest(1, least(coalesce(nullif(p_limit, 0), 30), 100));
$$;

comment on function public.list_friend_feed_top_author_page(int, timestamptz, uuid) is
  'Fallback feed page (newest first) for empty feeds: posts from the most active author.';

revoke all on function public.list_friend_feed_top_author_page(int, timestamptz, uuid) from public;
grant execute on function public.list_friend_feed_top_author_page(int, timestamptz, uuid) to authenticated;
