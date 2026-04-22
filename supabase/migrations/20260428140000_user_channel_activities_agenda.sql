-- Extend channel activity log with agenda events (user_agenda_events).

alter table public.user_channel_activities
  drop constraint if exists user_channel_activities_kind_check;

alter table public.user_channel_activities
  add constraint user_channel_activities_kind_check
  check (kind in ('post', 'follow', 'jam', 'song', 'agenda'));

drop policy if exists "user_channel_activities_select_visible" on public.user_channel_activities;

create policy "user_channel_activities_select_visible"
  on public.user_channel_activities
  for select
  to authenticated
  using (
    channel_user_id = (select auth.uid())
    or kind in ('jam', 'song', 'agenda')
    or (
      kind = 'post'
      and public.profile_is_mutual_follow((select auth.uid()), channel_user_id)
    )
    or (
      kind = 'follow'
      and (
        channel_user_id = (select auth.uid())
        or exists (
          select 1
          from public.profile_follows pf
          where pf.follower_id = (select auth.uid())
            and pf.following_id = user_channel_activities.channel_user_id
        )
      )
    )
  );

create or replace function public.user_channel_activity_touch_agenda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pf public.profiles%rowtype;
  doc jsonb;
begin
  if tg_op = 'DELETE' then
    delete from public.user_channel_activities
    where channel_user_id = old.author_id
      and dedupe_key = 'agenda:' || old.id::text;
    return old;
  end if;

  select * into pf from public.profiles p where p.id = new.author_id;

  doc := jsonb_build_object(
    'id', new.id,
    'authorId', new.author_id,
    'kind', new.kind,
    'title', new.title,
    'details', new.details,
    'addressText', new.address_text,
    'eventAt', new.event_at,
    'videoUrl', nullif(btrim(new.video_url), ''),
    'createdAt', new.created_at,
    'updatedAt', new.updated_at,
    'authorUsername', pf.username,
    'authorDisplayName', pf.display_name,
    'authorAvatarUrl', nullif(btrim(pf.avatar_url), '')
  );

  if tg_op = 'INSERT' then
    insert into public.user_channel_activities (channel_user_id, kind, sort_at, dedupe_key, payload)
    values (
      new.author_id,
      'agenda',
      new.created_at,
      'agenda:' || new.id::text,
      doc
    );
    return new;
  end if;

  update public.user_channel_activities
  set
    sort_at = new.created_at,
    payload = doc
  where channel_user_id = new.author_id
    and dedupe_key = 'agenda:' || new.id::text;
  return new;
end;
$$;

drop trigger if exists user_channel_activity_user_agenda_events on public.user_agenda_events;
create trigger user_channel_activity_user_agenda_events
  after insert or update or delete on public.user_agenda_events
  for each row
  execute procedure public.user_channel_activity_touch_agenda();

insert into public.user_channel_activities (channel_user_id, kind, sort_at, dedupe_key, payload)
select
  e.author_id,
  'agenda',
  e.created_at,
  'agenda:' || e.id::text,
  jsonb_build_object(
    'id', e.id,
    'authorId', e.author_id,
    'kind', e.kind,
    'title', e.title,
    'details', e.details,
    'addressText', e.address_text,
    'eventAt', e.event_at,
    'videoUrl', nullif(btrim(e.video_url), ''),
    'createdAt', e.created_at,
    'updatedAt', e.updated_at,
    'authorUsername', p.username,
    'authorDisplayName', p.display_name,
    'authorAvatarUrl', nullif(btrim(p.avatar_url), '')
  )
from public.user_agenda_events e
join public.profiles p on p.id = e.author_id
on conflict (channel_user_id, dedupe_key) do update
  set sort_at = excluded.sort_at,
      payload = excluded.payload;
