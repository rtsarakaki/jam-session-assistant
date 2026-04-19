-- PostgreSQL: SET LOCAL is not allowed in STABLE functions. Recreate as VOLATILE.
create or replace function public.profile_follows_edges_for_followers(p_follower_ids uuid[])
returns table (follower_id uuid, following_id uuid)
language plpgsql
volatile
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
