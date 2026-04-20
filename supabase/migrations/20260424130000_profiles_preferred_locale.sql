alter table public.profiles
  add column if not exists preferred_locale text not null default 'en';

alter table public.profiles
  drop constraint if exists profiles_preferred_locale_check;

alter table public.profiles
  add constraint profiles_preferred_locale_check
  check (preferred_locale in ('en', 'pt'));

comment on column public.profiles.preferred_locale is
  'Preferred app language used by authenticated UI (en|pt).';
