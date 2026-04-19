-- Perfil público por utilizador (ligado a auth.users).

create table public.profiles (
  id uuid not null primary key references auth.users (id) on delete cascade,
  display_name text,
  bio text,
  primary_instrument text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_len check (display_name is null or char_length(display_name) <= 120),
  constraint profiles_bio_len check (bio is null or char_length(bio) <= 500),
  constraint profiles_instrument_len check (primary_instrument is null or char_length(primary_instrument) <= 80)
);

comment on table public.profiles is 'App user profile; one row per auth user.';

create index profiles_updated_at_idx on public.profiles (updated_at desc);

-- Mantém updated_at em alterações vindas da API.
create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute procedure public.set_profiles_updated_at();

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

grant select, insert, update on table public.profiles to authenticated;

-- Cria linha em public.profiles quando nasce um utilizador em auth.users.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
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
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user_profile();

-- Utilizadores já existentes antes desta migração.
insert into public.profiles (id, display_name)
select
  u.id,
  nullif(
    trim(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))),
    ''
  )
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
