drop policy if exists "agenda_events_select_visible" on public.user_agenda_events;

create policy "agenda_events_select_visible"
  on public.user_agenda_events
  for select
  to authenticated
  using (true);
