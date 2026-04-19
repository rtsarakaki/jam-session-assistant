-- Lista de instrumentos (como no protótipo: presets + extras em texto).

alter table public.profiles
  add column if not exists instruments text[] not null default '{}';

update public.profiles
set instruments = case
  when primary_instrument is not null and btrim(primary_instrument) <> '' then array[btrim(primary_instrument)]
  else '{}'::text[]
end;

alter table public.profiles drop constraint if exists profiles_instrument_len;
alter table public.profiles drop column if exists primary_instrument;

alter table public.profiles
  add constraint profiles_instruments_max_count check (coalesce(cardinality(instruments), 0) <= 24);

comment on column public.profiles.instruments is 'Instrument labels: preset names and/or custom entries from "Other" (comma-separated).';
