-- Directed follows between app profiles (for Friends / network features).

create table public.profile_follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint profile_follows_no_self check (follower_id <> following_id)
);

comment on table public.profile_follows is 'follower_id follows following_id; used for Following and friends-of-friends.';

create index profile_follows_follower_idx on public.profile_follows (follower_id);
create index profile_follows_following_idx on public.profile_follows (following_id);

alter table public.profile_follows enable row level security;

-- Read own edges, plus edges whose follower is someone the current user follows (FoF discovery).
create policy "profile_follows_select_visible"
  on public.profile_follows
  for select
  to authenticated
  using (
    follower_id = (select auth.uid())
    or follower_id in (
      select pf.following_id
      from public.profile_follows pf
      where pf.follower_id = (select auth.uid())
    )
  );

create policy "profile_follows_insert_own"
  on public.profile_follows
  for insert
  to authenticated
  with check (follower_id = (select auth.uid()));

create policy "profile_follows_delete_own"
  on public.profile_follows
  for delete
  to authenticated
  using (follower_id = (select auth.uid()));

grant select, insert, delete on table public.profile_follows to authenticated;

-- Directory: any signed-in user can read basic profile fields for others (Friends "Everyone", jam picks).
create policy "profiles_select_visible_to_authenticated"
  on public.profiles
  for select
  to authenticated
  using (true);
