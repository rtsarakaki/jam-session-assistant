import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { APP_FEATURE_USER_CHANNEL_ACTIVITY_LOG, readAppFeatureFlagEnabled } from "@/lib/platform/app-feature-flags";
import { createSessionBoundDataClient } from "@/lib/platform/database";
import { formatProfileListName } from "@/lib/platform/friends-candidates";
import type { PublicProfileCard } from "@/lib/platform/friends-service";
import { loadMutuallyFollowedUserIds } from "@/lib/platform/mutual-follow-helpers";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Items per infinite-scroll page (merged across sources or read from `user_channel_activities` when enabled). */
export const USER_CHANNEL_PAGE_SIZE = 30;

const MAX_PER_SOURCE_FETCH = 4000;
const DEFAULT_PROFILE_INSTRUMENT = "Audience";

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  instruments: string[] | null;
};

function mapProfileCard(row: ProfileRow): PublicProfileCard {
  const instruments =
    Array.isArray(row.instruments) && row.instruments.length > 0 ? row.instruments : [DEFAULT_PROFILE_INSTRUMENT];
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url?.trim() || null,
    bio: row.bio?.trim() || null,
    instruments,
    listName: formatProfileListName(row.username, row.display_name, row.id),
  };
}

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

type JamSessionRelation = {
  id: string;
  title: string;
  status: string;
  started_at: string;
  created_by: string;
};

type ParticipantJoinRow = {
  session_id: string;
  joined_at: string;
  jam_sessions: JamSessionRelation | JamSessionRelation[] | null;
};

function publicProfileFromActivityPayload(raw: unknown, fallbackUserId: string): PublicProfileCard | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : fallbackUserId;
  const username = typeof o.username === "string" ? o.username : null;
  const displayName = typeof o.displayName === "string" ? o.displayName : null;
  const avatarUrl = typeof o.avatarUrl === "string" && o.avatarUrl.trim() ? o.avatarUrl.trim() : null;
  const bio = typeof o.bio === "string" && o.bio.trim() ? o.bio.trim() : null;
  const instruments = Array.isArray(o.instruments)
    ? o.instruments.filter((x): x is string => typeof x === "string")
    : [];
  const normalizedInstruments = instruments.length > 0 ? instruments : [DEFAULT_PROFILE_INSTRUMENT];
  return {
    id,
    username,
    displayName,
    avatarUrl,
    bio,
    instruments: normalizedInstruments,
    listName: formatProfileListName(username, displayName, id),
  };
}

export type UserChannelPost = {
  id: string;
  body: string;
  createdAt: string;
  linkedSong: { id: string; title: string; artist: string } | null;
};

export type UserChannelFollowEdge = {
  followingId: string;
  followedAt: string;
  target: PublicProfileCard;
};

export type UserChannelJamParticipation = {
  sessionId: string;
  title: string;
  status: string;
  startedAt: string;
  isOwner: boolean;
  joinedAt: string;
  participants: PublicProfileCard[];
};

export type UserChannelRegisteredSong = {
  id: string;
  title: string;
  artist: string;
  createdAt: string;
  lyricsUrl: string | null;
  listenUrl: string | null;
};

export type UserChannelActivityItem =
  | { kind: "post"; sortAt: string; key: string; post: UserChannelPost }
  | { kind: "follow"; sortAt: string; key: string; edge: UserChannelFollowEdge }
  | { kind: "jam"; sortAt: string; key: string; jam: UserChannelJamParticipation }
  | { kind: "song"; sortAt: string; key: string; song: UserChannelRegisteredSong };

export type UserChannelSnapshot = {
  channelUserId: string;
  viewerId: string;
  isOwnChannel: boolean;
  profile: PublicProfileCard | null;
  /** First page of activities (newest first). */
  activities: UserChannelActivityItem[];
  activitiesHasMore: boolean;
  activitiesNextCursor: { sortAt: string; key: string } | null;
  /** Users the viewer follows who also follow the viewer (for linking to `/app/user/[id]`). */
  mutualFollowUserIds: string[];
  /** Users currently followed by the viewer (used for follow CTA states). */
  followingUserIds: string[];
};

export function isUuidLike(value: string): boolean {
  return UUID_RE.test(value.trim());
}

async function assertCanViewUserChannelActivities(
  client: SupabaseClient,
  viewerUserId: string,
  channelUserId: string,
): Promise<void> {
  if (viewerUserId === channelUserId) return;
  const mutualIds = await loadMutuallyFollowedUserIds(client, viewerUserId);
  if (!mutualIds.has(channelUserId)) {
    throw new Error("Access denied.");
  }
}

type SourceBuckets = {
  posts: UserChannelPost[];
  follows: UserChannelFollowEdge[];
  jams: UserChannelJamParticipation[];
  songs: UserChannelRegisteredSong[];
};

async function fetchChannelSourceBuckets(
  client: SupabaseClient,
  channelUserId: string,
  perSourceLimit: number,
): Promise<SourceBuckets> {
  const { data: postRows, error: postsError } = await client
    .from("friend_feed_posts")
    .select("id, body, created_at, song_id, songs!friend_feed_posts_song_id_fkey ( id, title, artist )")
    .eq("author_id", channelUserId)
    .order("created_at", { ascending: false })
    .limit(perSourceLimit);

  if (postsError) {
    throw new Error(postsError.message);
  }

  const posts: UserChannelPost[] = (
    (postRows ?? []) as Array<{
      id: string;
      body: string;
      created_at: string;
      song_id: string | null;
      songs: { id: string; title: string; artist: string } | { id: string; title: string; artist: string }[] | null;
    }>
  ).map((r) => {
    const songRel = firstRelation(r.songs);
    const linkedSong =
      r.song_id && songRel
        ? { id: songRel.id, title: songRel.title.trim(), artist: songRel.artist.trim() }
        : null;
    return {
      id: r.id,
      body: r.body,
      createdAt: r.created_at,
      linkedSong: linkedSong?.title && linkedSong?.artist ? linkedSong : null,
    };
  });

  const { data: followRows, error: followsError } = await client
    .from("profile_follows")
    .select("following_id, created_at")
    .eq("follower_id", channelUserId)
    .order("created_at", { ascending: false })
    .limit(perSourceLimit);

  if (followsError) {
    throw new Error(followsError.message);
  }

  const rawFollows = (followRows ?? []) as Array<{ following_id: string; created_at: string }>;
  const followingIds = [...new Set(rawFollows.map((r) => r.following_id))];

  const profilesById = new Map<string, PublicProfileCard>();
  if (followingIds.length > 0) {
    const { data: followedProfiles, error: fpErr } = await client
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, instruments")
      .in("id", followingIds);

    if (fpErr) {
      throw new Error(fpErr.message);
    }
    for (const row of (followedProfiles ?? []) as ProfileRow[]) {
      profilesById.set(row.id, mapProfileCard(row));
    }
  }

  const follows: UserChannelFollowEdge[] = rawFollows
    .map((r) => {
      const target = profilesById.get(r.following_id);
      if (!target) return null;
      return {
        followingId: r.following_id,
        followedAt: r.created_at,
        target,
      };
    })
    .filter((x): x is UserChannelFollowEdge => x !== null);

  const { data: participantRows, error: jamErr } = await client
    .from("jam_session_participants")
    .select("session_id, joined_at, jam_sessions:session_id(id, title, status, started_at, created_by)")
    .eq("profile_id", channelUserId)
    .order("joined_at", { ascending: false })
    .limit(perSourceLimit);

  if (jamErr) {
    throw new Error(jamErr.message);
  }

  const jams: UserChannelJamParticipation[] = [];
  for (const row of (participantRows ?? []) as ParticipantJoinRow[]) {
    const session = firstRelation<JamSessionRelation>(row.jam_sessions);
    if (!session) continue;
    jams.push({
      sessionId: session.id,
      title: session.title,
      status: session.status,
      startedAt: session.started_at,
      isOwner: session.created_by === channelUserId,
      joinedAt: row.joined_at,
      participants: [],
    });
  }

  const { data: songRows, error: songsError } = await client
    .from("songs")
    .select("id, title, artist, created_at, lyrics_url, listen_url")
    .eq("created_by", channelUserId)
    .order("created_at", { ascending: false })
    .limit(perSourceLimit);

  if (songsError) {
    throw new Error(songsError.message);
  }

  const songs: UserChannelRegisteredSong[] = (
    (songRows ?? []) as Array<{
      id: string;
      title: string;
      artist: string;
      created_at: string;
      lyrics_url: string | null;
      listen_url: string | null;
    }>
  ).map((r) => ({
    id: r.id,
    title: r.title,
    artist: r.artist,
    createdAt: r.created_at,
    lyricsUrl: r.lyrics_url?.trim() || null,
    listenUrl: r.listen_url?.trim() || null,
  }));

  return { posts, follows, jams, songs };
}

function mergeChannelActivities(raw: SourceBuckets): UserChannelActivityItem[] {
  const rows: UserChannelActivityItem[] = [];
  for (const post of raw.posts) {
    rows.push({
      kind: "post",
      sortAt: post.createdAt,
      key: `post:${post.id}`,
      post,
    });
  }
  for (const edge of raw.follows) {
    rows.push({
      kind: "follow",
      sortAt: edge.followedAt,
      key: `follow:${edge.followingId}:${edge.followedAt}`,
      edge,
    });
  }
  for (const jam of raw.jams) {
    rows.push({
      kind: "jam",
      sortAt: jam.joinedAt,
      key: `jam:${jam.sessionId}`,
      jam,
    });
  }
  for (const song of raw.songs) {
    rows.push({
      kind: "song",
      sortAt: song.createdAt,
      key: `song:${song.id}`,
      song,
    });
  }
  rows.sort((a, b) => {
    const t = b.sortAt.localeCompare(a.sortAt);
    if (t !== 0) return t;
    return b.key.localeCompare(a.key);
  });
  return rows;
}

async function getLegacyUserChannelActivityPageWithClient(
  client: SupabaseClient,
  channelUserId: string,
  cursor: { sortAt: string; key: string } | null,
  pageSize: number,
): Promise<{ slice: UserChannelActivityItem[]; hasMore: boolean; nextCursor: { sortAt: string; key: string } | null }> {
  let perSourceLimit = Math.min(MAX_PER_SOURCE_FETCH, Math.max(pageSize, pageSize * 2));

  for (;;) {
    const raw = await fetchChannelSourceBuckets(client, channelUserId, perSourceLimit);
    const merged = mergeChannelActivities(raw);

    const exhausted =
      raw.posts.length < perSourceLimit &&
      raw.follows.length < perSourceLimit &&
      raw.jams.length < perSourceLimit &&
      raw.songs.length < perSourceLimit;

    const visible = cursor
      ? merged.filter((item) => item.sortAt < cursor.sortAt || (item.sortAt === cursor.sortAt && item.key < cursor.key))
      : merged;
    if (visible.length >= pageSize || exhausted) {
      const slice = visible.slice(0, pageSize);
      const hitCap =
        raw.posts.length === perSourceLimit ||
        raw.follows.length === perSourceLimit ||
        raw.jams.length === perSourceLimit ||
        raw.songs.length === perSourceLimit;
      const hasMore =
        visible.length > pageSize || (slice.length === pageSize && hitCap && !exhausted);
      const tail = slice[slice.length - 1];
      return { slice, hasMore, nextCursor: hasMore && tail ? { sortAt: tail.sortAt, key: tail.key } : null };
    }

    perSourceLimit += pageSize;
    if (perSourceLimit > MAX_PER_SOURCE_FETCH) {
      const visible = cursor
        ? merged.filter((item) => item.sortAt < cursor.sortAt || (item.sortAt === cursor.sortAt && item.key < cursor.key))
        : merged;
      const slice = visible.slice(0, pageSize);
      return { slice, hasMore: false, nextCursor: null };
    }
  }
}

type ActivityLogRow = {
  kind: string;
  sort_at: string;
  dedupe_key: string;
  payload: Record<string, unknown> | null;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function parseLinkedSongFromActivityPayload(payload: Record<string, unknown>): UserChannelPost["linkedSong"] {
  const songId = payload.songId;
  if (!isNonEmptyString(songId) || !isUuidLike(songId)) return null;
  const title = typeof payload.songTitle === "string" ? payload.songTitle.trim() : "";
  const artist = typeof payload.songArtist === "string" ? payload.songArtist.trim() : "";
  if (!title || !artist) return null;
  return { id: songId, title, artist };
}

function parseActivityItem(row: ActivityLogRow): UserChannelActivityItem | null {
  const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
  const sortAt = row.sort_at;
  const key = row.dedupe_key;

  if (row.kind === "post") {
    if (!isNonEmptyString(payload.id) || !isNonEmptyString(payload.body) || !isNonEmptyString(payload.createdAt)) return null;
    return {
      kind: "post",
      sortAt,
      key,
      post: {
        id: payload.id,
        body: payload.body,
        createdAt: payload.createdAt,
        linkedSong: parseLinkedSongFromActivityPayload(payload as Record<string, unknown>),
      },
    };
  }

  if (row.kind === "follow") {
    if (!isNonEmptyString(payload.followingId) || !isNonEmptyString(payload.followedAt)) return null;
    const target = publicProfileFromActivityPayload(payload.target, payload.followingId);
    if (!target) return null;
    return {
      kind: "follow",
      sortAt,
      key,
      edge: { followingId: payload.followingId, followedAt: payload.followedAt, target },
    };
  }

  if (row.kind === "jam") {
    const sessionId = typeof payload.sessionId === "string" ? payload.sessionId : "";
    const title = typeof payload.title === "string" ? payload.title : "";
    const status = typeof payload.status === "string" ? payload.status : "";
    const startedAt =
      typeof payload.startedAt === "string"
        ? payload.startedAt
        : typeof payload.startedAt === "number"
          ? new Date(payload.startedAt).toISOString()
          : "";
    const joinedAt =
      typeof payload.joinedAt === "string"
        ? payload.joinedAt
        : typeof payload.joinedAt === "number"
          ? new Date(payload.joinedAt).toISOString()
          : "";
    if (!sessionId || !startedAt || !joinedAt) return null;
    return {
      kind: "jam",
      sortAt,
      key,
      jam: {
        sessionId,
        title,
        status,
        startedAt,
        isOwner: Boolean(payload.isOwner),
        joinedAt,
        participants: Array.isArray(payload.participants)
          ? payload.participants
              .map((raw) => publicProfileFromActivityPayload(raw, ""))
              .filter((x): x is PublicProfileCard => x !== null)
          : [],
      },
    };
  }

  if (row.kind === "song") {
    if (!isNonEmptyString(payload.id) || !isNonEmptyString(payload.title) || !isNonEmptyString(payload.artist)) return null;
    const createdAt =
      typeof payload.createdAt === "string"
        ? payload.createdAt
        : typeof payload.createdAt === "number"
          ? new Date(payload.createdAt).toISOString()
          : "";
    if (!createdAt) return null;
    const lyricsUrl = typeof payload.lyricsUrl === "string" && payload.lyricsUrl.trim() ? payload.lyricsUrl.trim() : null;
    const listenUrl = typeof payload.listenUrl === "string" && payload.listenUrl.trim() ? payload.listenUrl.trim() : null;
    return {
      kind: "song",
      sortAt,
      key,
      song: { id: payload.id, title: payload.title, artist: payload.artist, createdAt, lyricsUrl, listenUrl },
    };
  }

  return null;
}

function isActivityLogSchemaMissing(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | undefined;
  if (e?.code === "42P01") return true;
  const msg = (e?.message ?? "").toLowerCase();
  return msg.includes("user_channel_activities") && (msg.includes("does not exist") || msg.includes("schema cache"));
}

async function getUserChannelActivityPageFromLogWithClient(
  client: SupabaseClient,
  channelUserId: string,
  cursor: { sortAt: string; key: string } | null,
  pageSize: number,
): Promise<{ slice: UserChannelActivityItem[]; hasMore: boolean; nextCursor: { sortAt: string; key: string } | null } | null> {
  const baseQuery = client
    .from("user_channel_activities")
    .select("kind, sort_at, dedupe_key, payload")
    .eq("channel_user_id", channelUserId)
    .order("sort_at", { ascending: false })
    .order("dedupe_key", { ascending: false });

  let data: ActivityLogRow[] | null = null;
  let error: { message: string } | null = null;
  if (!cursor) {
    const res = await baseQuery.limit(pageSize + 1);
    data = (res.data ?? []) as ActivityLogRow[];
    error = res.error ? { message: res.error.message } : null;
  } else {
    const [olderRes, sameTsRes] = await Promise.all([
      baseQuery.lt("sort_at", cursor.sortAt).limit(pageSize + 1),
      baseQuery.eq("sort_at", cursor.sortAt).lt("dedupe_key", cursor.key).limit(pageSize + 1),
    ]);
    if (olderRes.error) {
      error = { message: olderRes.error.message };
    } else if (sameTsRes.error) {
      error = { message: sameTsRes.error.message };
    } else {
      data = [
        ...((olderRes.data ?? []) as ActivityLogRow[]),
        ...((sameTsRes.data ?? []) as ActivityLogRow[]),
      ].sort((a, b) => {
        const t = b.sort_at.localeCompare(a.sort_at);
        if (t !== 0) return t;
        return b.dedupe_key.localeCompare(a.dedupe_key);
      });
    }
  }

  if (error) {
    if (isActivityLogSchemaMissing(error)) return null;
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const hasMore = rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows;
  const slice: UserChannelActivityItem[] = [];
  for (const row of pageRows) {
    const item = parseActivityItem(row);
    if (item) slice.push(item);
  }
  const tail = slice[slice.length - 1];
  return { slice, hasMore, nextCursor: hasMore && tail ? { sortAt: tail.sortAt, key: tail.key } : null };
}

async function getUserChannelActivityPageWithClient(
  client: SupabaseClient,
  channelUserId: string,
  cursor: { sortAt: string; key: string } | null,
  pageSize: number,
): Promise<{ slice: UserChannelActivityItem[]; hasMore: boolean; nextCursor: { sortAt: string; key: string } | null }> {
  const useActivityLog = await readAppFeatureFlagEnabled(client, APP_FEATURE_USER_CHANNEL_ACTIVITY_LOG);
  if (useActivityLog) {
    const fromLog = await getUserChannelActivityPageFromLogWithClient(client, channelUserId, cursor, pageSize);
    if (fromLog) return fromLog;
  }
  return getLegacyUserChannelActivityPageWithClient(client, channelUserId, cursor, pageSize);
}

async function hydrateJamParticipants(
  client: SupabaseClient,
  items: UserChannelActivityItem[],
): Promise<UserChannelActivityItem[]> {
  const jamSessionIds = [...new Set(items.filter((i) => i.kind === "jam").map((i) => i.jam.sessionId))];
  if (jamSessionIds.length === 0) return items;

  const { data: participantRows, error: participantErr } = await client
    .from("jam_session_participants")
    .select("session_id, profile_id")
    .in("session_id", jamSessionIds);
  if (participantErr) {
    return items;
  }

  const profileIds = [
    ...new Set(
      ((participantRows ?? []) as Array<{ session_id: string; profile_id: string }>)
        .map((row) => row.profile_id)
        .filter((id) => Boolean(id)),
    ),
  ];

  const profilesById = new Map<string, PublicProfileCard>();
  if (profileIds.length > 0) {
    const { data: profileRows, error: profileErr } = await client
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, instruments")
      .in("id", profileIds);
    if (!profileErr) {
      for (const row of (profileRows ?? []) as ProfileRow[]) {
        profilesById.set(row.id, mapProfileCard(row));
      }
    }
  }

  const participantBySessionId = new Map<string, PublicProfileCard[]>();
  for (const row of (participantRows ?? []) as Array<{ session_id: string; profile_id: string }>) {
    const profile = profilesById.get(row.profile_id);
    if (!profile) continue;
    const list = participantBySessionId.get(row.session_id) ?? [];
    if (!list.some((p) => p.id === profile.id)) {
      list.push(profile);
      participantBySessionId.set(row.session_id, list);
    }
  }

  return items.map((item) => {
    if (item.kind !== "jam") return item;
    return {
      ...item,
      jam: {
        ...item.jam,
        participants: participantBySessionId.get(item.jam.sessionId) ?? item.jam.participants,
      },
    };
  });
}

/**
 * Returns a slice of the activity stream (newest first).
 * Uses `user_channel_activities` only when `app_feature_flags.user_channel_activity_log` is enabled; otherwise merges legacy sources.
 */
export async function getUserChannelActivityPage(
  channelUserId: string,
  cursor: { sortAt: string; key: string } | null,
  pageSize: number = USER_CHANNEL_PAGE_SIZE,
): Promise<{ slice: UserChannelActivityItem[]; hasMore: boolean; nextCursor: { sortAt: string; key: string } | null }> {
  if (!isUuidLike(channelUserId)) {
    throw new Error("Invalid user id.");
  }

  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }
  await assertCanViewUserChannelActivities(client, user.id, channelUserId);

  const page = await getUserChannelActivityPageWithClient(client, channelUserId, cursor, pageSize);
  return {
    ...page,
    slice: await hydrateJamParticipants(client, page.slice),
  };
}

/** Loads public profile + first page of activities (RLS applies per table). */
export async function getUserChannelSnapshot(channelUserId: string): Promise<UserChannelSnapshot> {
  if (!isUuidLike(channelUserId)) {
    throw new Error("Invalid user id.");
  }

  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }
  await assertCanViewUserChannelActivities(client, user.id, channelUserId);

  const { data: profileRow, error: profileError } = await client
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, instruments")
    .eq("id", channelUserId)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const profile = profileRow ? mapProfileCard(profileRow as ProfileRow) : null;

  const mutualFollowUserIds = Array.from(await loadMutuallyFollowedUserIds(client, user.id));
  const { data: followingRows } = await client
    .from("profile_follows")
    .select("following_id")
    .eq("follower_id", user.id);
  const followingUserIds = [
    ...new Set(
      ((followingRows ?? []) as Array<{ following_id: string }>)
        .map((row) => row.following_id)
        .filter((id) => Boolean(id)),
    ),
  ];

  const { slice, hasMore: activitiesHasMore, nextCursor: activitiesNextCursor } = await getUserChannelActivityPageWithClient(
    client,
    channelUserId,
    null,
    USER_CHANNEL_PAGE_SIZE,
  );
  const activities = await hydrateJamParticipants(client, slice);

  return {
    channelUserId,
    viewerId: user.id,
    isOwnChannel: user.id === channelUserId,
    profile,
    activities,
    activitiesHasMore,
    activitiesNextCursor,
    mutualFollowUserIds,
    followingUserIds,
  };
}
