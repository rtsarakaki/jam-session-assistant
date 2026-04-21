create table if not exists public.user_agenda_events (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('show', 'attending', 'recommendation')),
  title text not null,
  details text,
  address_text text not null,
  event_at timestamptz not null,
  video_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_agenda_events_author_event_idx
  on public.user_agenda_events (author_id, event_at desc);

create index if not exists user_agenda_events_event_at_idx
  on public.user_agenda_events (event_at asc);

create or replace function public.user_agenda_events_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists user_agenda_events_touch_updated_at_trg on public.user_agenda_events;
create trigger user_agenda_events_touch_updated_at_trg
before update on public.user_agenda_events
for each row execute procedure public.user_agenda_events_touch_updated_at();

alter table public.user_agenda_events enable row level security;

drop policy if exists "agenda_events_select_visible" on public.user_agenda_events;
create policy "agenda_events_select_visible"
  on public.user_agenda_events
  for select
  to authenticated
  using (
    author_id = (select auth.uid())
    or exists (
      select 1
      from public.profile_follows pf
      where pf.follower_id = (select auth.uid())
        and pf.following_id = author_id
    )
  );

drop policy if exists "agenda_events_insert_own" on public.user_agenda_events;
create policy "agenda_events_insert_own"
  on public.user_agenda_events
  for insert
  to authenticated
  with check (author_id = (select auth.uid()));

drop policy if exists "agenda_events_update_own" on public.user_agenda_events;
create policy "agenda_events_update_own"
  on public.user_agenda_events
  for update
  to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists "agenda_events_delete_own" on public.user_agenda_events;
create policy "agenda_events_delete_own"
  on public.user_agenda_events
  for delete
  to authenticated
  using (author_id = (select auth.uid()));
