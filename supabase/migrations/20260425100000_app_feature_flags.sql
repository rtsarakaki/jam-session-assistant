-- Remote-configurable feature toggles (read by the Next.js server via Supabase session client).

create table public.app_feature_flags (
  flag_key text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

comment on table public.app_feature_flags is
  'Boolean feature switches; app reads with RLS. Keep defaults safe until rollout.';

alter table public.app_feature_flags enable row level security;

create policy "app_feature_flags_select_authenticated"
  on public.app_feature_flags
  for select
  to authenticated
  using (true);

revoke all on public.app_feature_flags from public;
grant select on public.app_feature_flags to authenticated;

insert into public.app_feature_flags (flag_key, enabled)
values ('user_channel_activity_log', false)
on conflict (flag_key) do nothing;
