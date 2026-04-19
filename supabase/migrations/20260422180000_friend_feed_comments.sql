-- Comments on friend feed posts (same visibility as posts: mutual followers + own posts).

create table public.friend_feed_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.friend_feed_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint friend_feed_comments_body_len check (char_length(body) between 1 and 2000)
);

comment on table public.friend_feed_comments is
  'Comments on feed posts; readable where the parent post is visible (author or mutual with author).';

create index friend_feed_comments_post_created_idx
  on public.friend_feed_comments (post_id, created_at asc, id asc);

alter table public.friend_feed_comments enable row level security;

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
          or public.profile_is_mutual_follow((select auth.uid()), p.author_id)
        )
    )
  );

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
          or public.profile_is_mutual_follow((select auth.uid()), p.author_id)
        )
    )
  );

create policy "friend_feed_comments_delete_own"
  on public.friend_feed_comments
  for delete
  to authenticated
  using (author_id = (select auth.uid()));

grant select, insert, delete on table public.friend_feed_comments to authenticated;

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
security invoker
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
  join public.profiles p on p.id = c.author_id
  where c.post_id = any(p_post_ids)
  order by c.post_id asc, c.created_at asc, c.id asc;
$$;

comment on function public.list_friend_feed_comments_for_posts(uuid[]) is
  'Comments for given post ids (oldest first per post). RLS on friend_feed_comments applies.';

revoke all on function public.list_friend_feed_comments_for_posts(uuid[]) from public;
grant execute on function public.list_friend_feed_comments_for_posts(uuid[]) to authenticated;
