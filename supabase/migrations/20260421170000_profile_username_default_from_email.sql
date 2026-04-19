-- Default username from auth email local-part (slug + unique suffix). Applies on new users and backfills nulls.

create or replace function public.profile_username_from_auth(p_email text, p_user_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  local_part text;
  slug text;
  candidate text;
  n int := 0;
begin
  local_part := split_part(lower(trim(coalesce(p_email, ''))), '@', 1);
  slug := regexp_replace(local_part, '[^a-z0-9]+', '_', 'g');
  slug := regexp_replace(slug, '_+', '_', 'g');
  slug := trim(both '_' from slug);

  if slug is null or slug = '' then
    slug := 'user_' || left(replace(p_user_id::text, '-', ''), 8);
  end if;

  if char_length(slug) < 3 then
    slug := left(slug || '_' || left(replace(p_user_id::text, '-', ''), 8), 30);
  end if;

  slug := left(slug, 30);

  if slug in (
    'admin', 'administrator', 'help', 'jam', 'moderator',
    'null', 'root', 'support', 'system', 'undefined'
  ) then
    slug := left(slug || '_' || left(replace(p_user_id::text, '-', ''), 8), 30);
  end if;

  candidate := slug;
  loop
    exit when not exists (
      select 1
      from public.profiles p
      where p.username = candidate
        and p.id is distinct from p_user_id
    );
    n := n + 1;
    if n > 100000 then
      raise exception 'could not allocate a unique username';
    end if;
    candidate := left(regexp_replace(slug || '_' || n::text, '_+', '_', 'g'), 30);
  end loop;

  return candidate;
end;
$$;

comment on function public.profile_username_from_auth(text, uuid) is
  'Derives a unique profiles.username from auth email (local part slug); used on signup and backfill.';

revoke all on function public.profile_username_from_auth(text, uuid) from public;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    nullif(
      trim(
        coalesce(
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'display_name',
          split_part(new.email, '@', 1)
        )
      ),
      ''
    ),
    public.profile_username_from_auth(new.email, new.id)
  );
  return new;
end;
$$;

-- Existing profiles without a username (e.g. created before column existed).
update public.profiles p
set username = public.profile_username_from_auth(u.email, p.id)
from auth.users u
where u.id = p.id
  and p.username is null;
