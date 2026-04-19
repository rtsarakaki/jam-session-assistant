-- Let users read incoming follow edges (who follows them), not only outgoing.
drop policy if exists "profile_follows_select_own" on public.profile_follows;

create policy "profile_follows_select_own"
  on public.profile_follows
  for select
  to authenticated
  using (
    follower_id = (select auth.uid())
    or following_id = (select auth.uid())
  );
