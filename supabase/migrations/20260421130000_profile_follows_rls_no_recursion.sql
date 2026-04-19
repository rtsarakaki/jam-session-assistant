-- Fix infinite recursion: SELECT policy must not query profile_follows under the same RLS.
-- SECURITY DEFINER + table owner bypasses RLS inside the function body.

create or replace function public.profile_follows_my_following_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select following_id
  from public.profile_follows
  where follower_id = (select auth.uid());
$$;

comment on function public.profile_follows_my_following_ids() is
  'IDs the current user follows; used by RLS on profile_follows to avoid recursive policy checks.';

revoke all on function public.profile_follows_my_following_ids() from public;
grant execute on function public.profile_follows_my_following_ids() to authenticated;

drop policy if exists "profile_follows_select_visible" on public.profile_follows;

create policy "profile_follows_select_visible"
  on public.profile_follows
  for select
  to authenticated
  using (
    follower_id = (select auth.uid())
    or follower_id in (select public.profile_follows_my_following_ids())
  );
