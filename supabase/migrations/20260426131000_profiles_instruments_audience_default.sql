-- Add "Audience" as default instrument for all profiles.

alter table public.profiles
  alter column instruments set default array['Audience']::text[];

update public.profiles
set instruments = array['Audience']::text[]
where instruments is null
   or cardinality(instruments) = 0;

comment on column public.profiles.instruments is
  'Preset instrument labels and optional jam flag "Any song (full repertoire)"; defaults to Audience.';
