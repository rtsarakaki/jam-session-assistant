-- Stop RLS recursion on profile_follows: SELECT policy only sees own edges.
-- Friends-of-friends reads use a SECURITY DEFINER RPC (validates inputs, then row_security off).

drop policy if exists "profile_follows_select_visible" on public.profile_follows;

create policy "profile_follows_select_own"
  on public.profile_follows
  for select
  to authenticated
  using (follower_id = (select auth.uid()));

drop function if exists public.profile_follows_my_following_ids();

create or replace function public.profile_follows_edges_for_followers(p_follower_ids uuid[])
returns table (follower_id uuid, following_id uuid)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  allowed uuid[];
begin
  if p_follower_ids is null or cardinality(p_follower_ids) = 0 then
    return;
  end if;

  set local row_security = off;

  select coalesce(array_agg(pf.following_id), '{}')
    into allowed
    from public.profile_follows pf
    where pf.follower_id = (select auth.uid());

  if not (p_follower_ids <@ allowed) then
    raise exception 'invalid follower_ids'
      using errcode = '42501',
        hint = 'Every id must be someone you follow.';
  end if;

  return query
  select pf.follower_id, pf.following_id
  from public.profile_follows pf
  where pf.follower_id = any (p_follower_ids);
end;
$$;

comment on function public.profile_follows_edges_for_followers(uuid[]) is
  'Returns follow edges for given follower_ids; caller must only pass users they follow (enforced).';

revoke all on function public.profile_follows_edges_for_followers(uuid[]) from public;
grant execute on function public.profile_follows_edges_for_followers(uuid[]) to authenticated;
