insert into public.app_feature_flags (flag_key, enabled)
values ('user_agenda', false)
on conflict (flag_key) do nothing;
