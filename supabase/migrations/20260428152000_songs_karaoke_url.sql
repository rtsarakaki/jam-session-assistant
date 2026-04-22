-- Optional karaoke/backing-track URL in catalog songs.

alter table public.songs
  add column if not exists karaoke_url text;

alter table public.songs
  drop constraint if exists songs_karaoke_url_http;

alter table public.songs
  add constraint songs_karaoke_url_http
  check (
    karaoke_url is null
    or karaoke_url ~* '^https?://'
  );
