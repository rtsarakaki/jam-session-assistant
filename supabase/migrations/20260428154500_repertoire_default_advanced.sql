-- Default repertoire level should be ADVANCED when level is omitted.

alter table public.repertoire_songs
  alter column level set default 'ADVANCED'::public.repertoire_level;
