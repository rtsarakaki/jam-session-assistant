-- Feed visibility: posts (and comments/likes) readable when you follow the author
-- (one-way), not only mutual follows. Own posts unchanged.

create or replace function public.profile_user_follows(p_user uuid, p_other uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_user is null or p_other is null or p_user = p_other then
    return false;
  end if;

  set local row_security = off;

  return exists (
    select 1
    from public.profile_follows fwd
    where fwd.follower_id = p_user
      and fwd.following_id = p_other
  );
end;
$$;

comment on function public.profile_user_follows(uuid, uuid) is
  'True when p_user follows p_other; used for friend feed visibility.';

revoke all on function public.profile_user_follows(uuid, uuid) from public;
grant execute on function public.profile_user_follows(uuid, uuid) to authenticated;

comment on table public.friend_feed_posts is
  'User posts (gigs, links, videos). Readable by author and anyone who follows the author.';

drop policy if exists "friend_feed_posts_select_mutual_or_own" on public.friend_feed_posts;

create policy "friend_feed_posts_select_follows_or_own"
  on public.friend_feed_posts
  for select
  to authenticated
  using (
    author_id = (select auth.uid())
    or public.profile_user_follows((select auth.uid()), author_id)
  );

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
        and (
          p.author_id = (select auth.uid())
          or public.profile_user_follows((select auth.uid()), p.author_id)
        )
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
        and (
          p.author_id = (select auth.uid())
          or public.profile_user_follows((select auth.uid()), p.author_id)
        )
    )
  );

comment on table public.friend_feed_comments is
  'Comments on feed posts; readable where the parent post is visible (author or you follow the author).';

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
          or public.profile_user_follows((select auth.uid()), p.author_id)
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
          or public.profile_user_follows((select auth.uid()), p.author_id)
        )
    )
  );

comment on table public.friend_feed_post_likes is
  'One like per user per post. Readable where the parent post is visible (author or you follow the author).';
