-- Jam participant search (full-text over display name, username, email)
-- with selectable scope: friends only or all users.

create or replace function public.search_jam_participants(
  p_query text default '',
  p_scope text default 'friends',
  p_limit integer default 50
)
returns table (
  profile_id uuid,
  username text,
  display_name text,
  email text,
  is_friend boolean
)
language sql
security definer
set search_path = public, auth
as $$
with me as (
  select (select auth.uid()) as uid
),
friends as (
  select pf.following_id as profile_id
  from public.profile_follows pf
  join me on me.uid = pf.follower_id
),
candidates as (
  select
    p.id as profile_id,
    p.username,
    p.display_name,
    u.email,
    exists (select 1 from friends f where f.profile_id = p.id) as is_friend
  from public.profiles p
  join auth.users u on u.id = p.id
  join me on true
  where p.id <> me.uid
    and (
      case
        when lower(coalesce(p_scope, 'friends')) = 'all' then true
        else exists (select 1 from friends f where f.profile_id = p.id)
      end
    )
),
filtered as (
  select *
  from candidates c
  where
    coalesce(trim(p_query), '') = ''
    or to_tsvector('simple', coalesce(c.display_name, '') || ' ' || coalesce(c.username, '') || ' ' || coalesce(c.email, ''))
       @@ plainto_tsquery('simple', trim(p_query))
    or coalesce(c.display_name, '') ilike '%' || trim(p_query) || '%'
    or coalesce(c.username, '') ilike '%' || trim(p_query) || '%'
    or coalesce(c.email, '') ilike '%' || trim(p_query) || '%'
)
select
  f.profile_id,
  f.username,
  f.display_name,
  f.email,
  f.is_friend
from filtered f
order by
  f.is_friend desc,
  coalesce(f.display_name, f.username, f.email) asc
limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

grant execute on function public.search_jam_participants(text, text, integer) to authenticated;
