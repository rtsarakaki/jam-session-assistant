alter table public.app_notifications
drop constraint if exists app_notifications_type_check;

alter table public.app_notifications
add constraint app_notifications_type_check
check (
  type in (
    'follow',
    'like',
    'comment',
    'share',
    'jam_created',
    'song_created',
    'agenda_upcoming'
  )
);
