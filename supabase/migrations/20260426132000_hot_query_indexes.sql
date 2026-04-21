-- Performance indexes for hot read paths at scale.
-- Safe to re-run with IF NOT EXISTS.

-- Feed: author timeline + keyset pagination support.
create index if not exists friend_feed_posts_author_created_id_idx
  on public.friend_feed_posts (author_id, created_at desc, id desc);

-- Feed suggestions / onboarding discovery:
-- recent profiles and recently updated profiles.
create index if not exists profiles_created_at_idx
  on public.profiles (created_at desc);

create index if not exists profiles_updated_at_desc_idx
  on public.profiles (updated_at desc);

-- Follows: keep read-side lookups efficient for social graph traversals.
create index if not exists profile_follows_follower_created_idx
  on public.profile_follows (follower_id, created_at desc);

create index if not exists profile_follows_following_created_idx
  on public.profile_follows (following_id, created_at desc);

-- Notifications: unread list by recipient ordered by time + TTL cleanup by read_at.
create index if not exists app_notifications_recipient_unread_created_idx
  on public.app_notifications (recipient_id, created_at desc)
  where read_at is null;

create index if not exists app_notifications_read_at_idx
  on public.app_notifications (read_at)
  where read_at is not null;

-- User channel activities: keyset pagination by (sort_at, dedupe_key).
create index if not exists user_channel_activities_channel_sort_dedupe_idx
  on public.user_channel_activities (channel_user_id, sort_at desc, dedupe_key desc);

-- Jam approvals: owner queue filtered by session and pending status.
create index if not exists jam_session_join_requests_session_status_created_idx
  on public.jam_session_join_requests (session_id, status, created_at desc);
