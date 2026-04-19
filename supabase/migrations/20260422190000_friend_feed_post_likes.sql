-- Likes on friend feed posts (visibility aligned with posts: mutual + own).

create table public.friend_feed_post_likes (
  post_id uuid not null references public.friend_feed_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

comment on table public.friend_feed_post_likes is
  'One like per user per post. Readable where the parent post is visible.';

create index friend_feed_post_likes_post_created_idx
  on public.friend_feed_post_likes (post_id, created_at desc);

alter table public.friend_feed_post_likes enable row level security;

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
          or public.profile_is_mutual_follow((select auth.uid()), p.author_id)
        )
    )
  );

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
          or public.profile_is_mutual_follow((select auth.uid()), p.author_id)
        )
    )
  );

create policy "friend_feed_post_likes_delete_own"
  on public.friend_feed_post_likes
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, delete on table public.friend_feed_post_likes to authenticated;

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
security invoker
set search_path = public
as $$
  select
    l.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    l.created_at
  from public.friend_feed_post_likes l
  join public.profiles p on p.id = l.user_id
  where l.post_id = p_post_id
  order by l.created_at desc, l.user_id desc;
$$;

comment on function public.list_friend_feed_post_likers(uuid) is
  'Profiles who liked a feed post (newest first). RLS on friend_feed_post_likes applies.';

revoke all on function public.list_friend_feed_post_likers(uuid) from public;
grant execute on function public.list_friend_feed_post_likers(uuid) to authenticated;
