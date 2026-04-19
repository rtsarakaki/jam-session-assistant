-- Profile picture URL (HTTPS from auth metadata), same keys as the app header OAuth avatar.

alter table public.profiles
  add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is 'HTTPS image URL copied from auth user_metadata (avatar_url / picture / avatar) at signup.';

alter table public.profiles drop constraint if exists profiles_avatar_url_http;

alter table public.profiles
  add constraint profiles_avatar_url_http check (
    avatar_url is null
    or avatar_url ~* '^https?://'
  );

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb;
  av text;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);

  av := coalesce(
    nullif(trim(meta->>'avatar_url'), ''),
    nullif(trim(meta->>'picture'), ''),
    nullif(trim(meta->>'avatar'), '')
  );
  if av is not null and av !~* '^https?://' then
    av := null;
  end if;

  insert into public.profiles (id, display_name, username, avatar_url)
  values (
    new.id,
    nullif(
      trim(
        coalesce(
          meta->>'full_name',
          meta->>'display_name',
          split_part(new.email, '@', 1)
        )
      ),
      ''
    ),
    public.profile_username_from_auth(new.email, new.id),
    av
  );
  return new;
end;
$$;

update public.profiles p
set avatar_url = v.url
from (
  select
    u.id,
    case
      when trim(coalesce(u.raw_user_meta_data->>'avatar_url', '')) ~* '^https?://'
        then trim(u.raw_user_meta_data->>'avatar_url')
      when trim(coalesce(u.raw_user_meta_data->>'picture', '')) ~* '^https?://'
        then trim(u.raw_user_meta_data->>'picture')
      when trim(coalesce(u.raw_user_meta_data->>'avatar', '')) ~* '^https?://'
        then trim(u.raw_user_meta_data->>'avatar')
      else null
    end as url
  from auth.users u
) v
where p.id = v.id
  and v.url is not null
  and (p.avatar_url is null or p.avatar_url = '');
