-- Friend feed: short invite-style posts visible to mutual followers only.

create table public.friend_feed_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint friend_feed_posts_body_len check (char_length(body) between 1 and 4000)
);

comment on table public.friend_feed_posts is
  'User posts (gigs, links, videos). Readable by author and mutual followers (both follow each other).';

create index friend_feed_posts_created_id_idx
  on public.friend_feed_posts (created_at desc, id desc);

alter table public.friend_feed_posts enable row level security;

-- Mutual follow check must bypass profile_follows RLS (users only see their own outgoing edges).
create or replace function public.profile_is_mutual_follow(p_user uuid, p_other uuid)
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
  )
  and exists (
    select 1
    from public.profile_follows rev
    where rev.follower_id = p_other
      and rev.following_id = p_user
  );
end;
$$;

comment on function public.profile_is_mutual_follow(uuid, uuid) is
  'True when p_user and p_other follow each other; used by friend_feed_posts RLS.';

revoke all on function public.profile_is_mutual_follow(uuid, uuid) from public;
grant execute on function public.profile_is_mutual_follow(uuid, uuid) to authenticated;

create policy "friend_feed_posts_select_mutual_or_own"
  on public.friend_feed_posts
  for select
  to authenticated
  using (
    author_id = (select auth.uid())
    or public.profile_is_mutual_follow((select auth.uid()), author_id)
  );

create policy "friend_feed_posts_insert_own"
  on public.friend_feed_posts
  for insert
  to authenticated
  with check (author_id = (select auth.uid()));

create policy "friend_feed_posts_update_own"
  on public.friend_feed_posts
  for update
  to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy "friend_feed_posts_delete_own"
  on public.friend_feed_posts
  for delete
  to authenticated
  using (author_id = (select auth.uid()));

grant select, insert, update, delete on table public.friend_feed_posts to authenticated;

-- Keyset page (newest first); RLS applies to friend_feed_posts rows.
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
security invoker
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
  order by f.created_at desc, f.id desc
  limit greatest(1, least(coalesce(nullif(p_limit, 0), 30), 100));
$$;

comment on function public.list_friend_feed_page(int, timestamptz, uuid) is
  'Paginated friend feed (newest first). Caller must be authenticated; RLS filters visible posts.';

revoke all on function public.list_friend_feed_page(int, timestamptz, uuid) from public;
grant execute on function public.list_friend_feed_page(int, timestamptz, uuid) to authenticated;
