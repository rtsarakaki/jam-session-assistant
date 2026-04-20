-- App notifications (follow, like, comment, share) with retention:
-- read notifications are kept for 1 month, then can be cleaned up.

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('follow', 'like', 'comment', 'share')),
  title text not null,
  body text not null,
  resource_path text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists app_notifications_recipient_created_idx
  on public.app_notifications (recipient_id, created_at desc);

create index if not exists app_notifications_recipient_unread_idx
  on public.app_notifications (recipient_id)
  where read_at is null;

alter table public.app_notifications enable row level security;

drop policy if exists "app_notifications_select_recipient" on public.app_notifications;
create policy "app_notifications_select_recipient"
  on public.app_notifications
  for select
  to authenticated
  using (recipient_id = (select auth.uid()));

drop policy if exists "app_notifications_insert_actor" on public.app_notifications;
create policy "app_notifications_insert_actor"
  on public.app_notifications
  for insert
  to authenticated
  with check (
    actor_id = (select auth.uid())
    and recipient_id <> (select auth.uid())
  );

drop policy if exists "app_notifications_update_recipient" on public.app_notifications;
create policy "app_notifications_update_recipient"
  on public.app_notifications
  for update
  to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

drop policy if exists "app_notifications_delete_recipient" on public.app_notifications;
create policy "app_notifications_delete_recipient"
  on public.app_notifications
  for delete
  to authenticated
  using (recipient_id = (select auth.uid()));

comment on table public.app_notifications is
  'In-app notification center for social events (follow, like, comment, share).';
