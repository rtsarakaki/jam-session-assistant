-- Public unique handle (lowercase in app); optional until user sets it.

alter table public.profiles
  add column if not exists username text;

comment on column public.profiles.username is
  'Unique handle (stored lowercase: a–z, 0–9, underscore). Used in Friends / jam.';

alter table public.profiles drop constraint if exists profiles_username_format;

alter table public.profiles
  add constraint profiles_username_format check (
    username is null
    or (
      char_length(username) between 3 and 30
      and username ~ '^[a-z0-9_]+$'
    )
  );

create unique index if not exists profiles_username_uidx
  on public.profiles (username)
  where username is not null;
