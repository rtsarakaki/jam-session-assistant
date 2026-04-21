import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSessionBoundDataClient } from "@/lib/platform/database";
import { formatProfileListName } from "@/lib/platform/friends-candidates";
import { canOpenUserActivitiesPage, loadMutuallyFollowedUserIds } from "@/lib/platform/mutual-follow-helpers";
import { createAppNotification } from "@/lib/platform/notifications-service";
import { FRIEND_FEED_BODY_MAX } from "@/lib/validation/friend-feed-body";

export type FriendFeedCommentItem = {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
  authorUsername: string | null;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  /** True when viewer may open this author's `/app/user/[id]` (mutual follow or self). */
  canOpenActivitiesPage: boolean;
};

export type FriendFeedPostItem = {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  authorUsername: string | null;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  likeCount: number;
  likedByMe: boolean;
  comments: FriendFeedCommentItem[];
  /** True when viewer may open the author's `/app/user/[id]` (mutual follow or self). */
  canOpenActivitiesPage: boolean;
};

export type FriendFeedPostLikerItem = {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  likedAt: string;
  canOpenActivitiesPage: boolean;
};

export type FeedFollowSuggestionItem = {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  instruments: string[];
  label: string;
  reason: "fof" | "activity" | "recent";
  score: number;
};
const DEFAULT_PROFILE_INSTRUMENT = "Audience";
const FEED_READ_CACHE_TTL_MS = 20_000;
const FEED_SUGGESTIONS_CACHE_TTL_MS = 45_000;

type CacheEntry<T> = { expiresAt: number; value: T };
const feedPageReadCache = new Map<string, CacheEntry<{
  items: FriendFeedPostItem[];
  nextCursor: { createdAt: string; id: string } | null;
  followSuggestions: FeedFollowSuggestionItem[];
}>>();
const feedSuggestionsCache = new Map<string, CacheEntry<FeedFollowSuggestionItem[]>>();

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cacheGet<T>(store: Map<string, CacheEntry<T>>, key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() >= hit.expiresAt) {
    store.delete(key);
    return null;
  }
  return deepClone(hit.value);
}

function cacheSet<T>(store: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number): void {
  store.set(key, { expiresAt: Date.now() + ttlMs, value: deepClone(value) });
}

type RpcFeedRow = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  author_username: string | null;
  author_display_name: string | null;
  author_avatar_url: string | null;
};

type RpcCommentRow = {
  post_id: string;
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  author_username: string | null;
  author_display_name: string | null;
  author_avatar_url: string | null;
};

type RpcLikerRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  liked_at: string;
};

type LikeSummary = { likeCount: number; likedByMe: boolean };

function mapRow(
  r: RpcFeedRow,
  comments: FriendFeedCommentItem[],
  likes: LikeSummary,
  viewerId: string,
  mutualUserIds: Set<string>,
): FriendFeedPostItem {
  return {
    id: r.id,
    authorId: r.author_id,
    body: r.body,
    createdAt: r.created_at,
    authorUsername: r.author_username,
    authorDisplayName: r.author_display_name,
    authorAvatarUrl: r.author_avatar_url?.trim() || null,
    likeCount: likes.likeCount,
    likedByMe: likes.likedByMe,
    comments,
    canOpenActivitiesPage: canOpenUserActivitiesPage(viewerId, r.author_id, mutualUserIds),
  };
}

function mapCommentRow(r: RpcCommentRow, viewerId: string, mutualUserIds: Set<string>): FriendFeedCommentItem {
  return {
    id: r.id,
    postId: r.post_id,
    authorId: r.author_id,
    body: r.body,
    createdAt: r.created_at,
    authorUsername: r.author_username,
    authorDisplayName: r.author_display_name,
    authorAvatarUrl: r.author_avatar_url?.trim() || null,
    canOpenActivitiesPage: canOpenUserActivitiesPage(viewerId, r.author_id, mutualUserIds),
  };
}

/** Newest first (then id desc) for feed UI. */
function sortCommentsNewestFirst(items: FriendFeedCommentItem[]): void {
  items.sort((a, b) => {
    const t = b.createdAt.localeCompare(a.createdAt);
    if (t !== 0) return t;
    return b.id.localeCompare(a.id);
  });
}

async function fetchCommentsGroupedByPostId(
  client: SupabaseClient,
  postIds: string[],
  viewerId: string,
  mutualUserIds: Set<string>,
): Promise<Map<string, FriendFeedCommentItem[]>> {
  const map = new Map<string, FriendFeedCommentItem[]>();
  if (postIds.length === 0) {
    return map;
  }
  const { data, error } = await client.rpc("list_friend_feed_comments_for_posts", {
    p_post_ids: postIds,
  });
  if (error) {
    throw new Error(error.message);
  }
  const rows = (data ?? []) as RpcCommentRow[];
  for (const r of rows) {
    const item = mapCommentRow(r, viewerId, mutualUserIds);
    const list = map.get(item.postId) ?? [];
    list.push(item);
    map.set(item.postId, list);
  }
  for (const list of map.values()) {
    sortCommentsNewestFirst(list);
  }
  return map;
}

async function fetchLikeSummariesForPosts(
  client: Awaited<ReturnType<typeof createSessionBoundDataClient>>,
  postIds: string[],
  myUserId: string,
): Promise<Map<string, LikeSummary>> {
  const map = new Map<string, LikeSummary>();
  for (const id of postIds) {
    map.set(id, { likeCount: 0, likedByMe: false });
  }
  if (postIds.length === 0) {
    return map;
  }
  const { data, error } = await client
    .from("friend_feed_post_likes")
    .select("post_id, user_id")
    .in("post_id", postIds);
  if (error) {
    throw new Error(error.message);
  }
  const rows = (data ?? []) as { post_id: string; user_id: string }[];
  for (const row of rows) {
    const cur = map.get(row.post_id) ?? { likeCount: 0, likedByMe: false };
    cur.likeCount += 1;
    if (row.user_id === myUserId) {
      cur.likedByMe = true;
    }
    map.set(row.post_id, cur);
  }
  return map;
}

const DEFAULT_PAGE = 30;
const MAX_PAGE = 100;

type RpcTopAuthorFeedRow = RpcFeedRow;

/** Newest-first keyset page; visibility enforced by RLS (own posts + authors you follow). */
export async function listFriendFeedPostsPage(input: {
  limit?: number;
  cursor?: { createdAt: string; id: string } | null;
}): Promise<{
  items: FriendFeedPostItem[];
  nextCursor: { createdAt: string; id: string } | null;
  followSuggestions: FeedFollowSuggestionItem[];
}> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }
  const cacheKey = `${user.id}|${input.limit ?? DEFAULT_PAGE}|${input.cursor?.createdAt ?? "first"}|${input.cursor?.id ?? "first"}`;
  const cachedPage = cacheGet(feedPageReadCache, cacheKey);
  if (cachedPage) return cachedPage;

  const pageSize = Math.min(
    MAX_PAGE,
    Math.max(1, input.limit ?? DEFAULT_PAGE),
  );

  const { data, error } = await client.rpc("list_friend_feed_page", {
    p_limit: pageSize + 1,
    p_before_created_at: input.cursor?.createdAt ?? null,
    p_before_id: input.cursor?.id ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  let rows = (data ?? []) as RpcFeedRow[];
  if (rows.length === 0 && !input.cursor) {
    const { data: fallbackRows, error: fallbackErr } = await client.rpc("list_friend_feed_top_author_page", {
      p_limit: pageSize + 1,
      p_before_created_at: null,
      p_before_id: null,
    });
    if (fallbackErr) {
      throw new Error(fallbackErr.message);
    }
    rows = (fallbackRows ?? []) as RpcTopAuthorFeedRow[];
  }
  const hasMore = rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows;
  const postIds = pageRows.map((r) => r.id);
  const mutualUserIds = await loadMutuallyFollowedUserIds(client, user.id);
  const commentsByPost = await fetchCommentsGroupedByPostId(client, postIds, user.id, mutualUserIds);
  const likeByPost = await fetchLikeSummariesForPosts(client, postIds, user.id);
  const items = pageRows.map((r) =>
    mapRow(
      r,
      commentsByPost.get(r.id) ?? [],
      likeByPost.get(r.id) ?? { likeCount: 0, likedByMe: false },
      user.id,
      mutualUserIds,
    ),
  );
  const tail = items[items.length - 1];
  const nextCursor =
    hasMore && tail
      ? {
          createdAt: tail.createdAt,
          id: tail.id,
        }
      : null;

  const followSuggestions = await listFeedFollowSuggestions(client, {
    myUserId: user.id,
    limit: 3,
    seed: `${input.cursor?.createdAt ?? "initial"}:${input.cursor?.id ?? "initial"}`,
  });
  const result = { items, nextCursor, followSuggestions };
  cacheSet(feedPageReadCache, cacheKey, result, FEED_READ_CACHE_TTL_MS);
  return result;
}

function seededUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

async function listFeedFollowSuggestions(
  client: Awaited<ReturnType<typeof createSessionBoundDataClient>>,
  input: { myUserId: string; limit: number; seed: string },
): Promise<FeedFollowSuggestionItem[]> {
  const cacheKey = `${input.myUserId}|${input.limit}|${input.seed}`;
  const cached = cacheGet(feedSuggestionsCache, cacheKey);
  if (cached) return cached;
  const { data: myFollows, error: myFollowsErr } = await client
    .from("profile_follows")
    .select("following_id")
    .eq("follower_id", input.myUserId);
  if (myFollowsErr) throw new Error(myFollowsErr.message);
  const followingIds = (myFollows ?? []).map((r) => (r as { following_id: string }).following_id);
  const followingSet = new Set(followingIds);
  followingSet.add(input.myUserId);

  const fofCountByUser = new Map<string, number>();
  if (followingIds.length > 0) {
    const { data: edgesRows, error: edgesErr } = await client.rpc("profile_follows_edges_for_followers", {
      p_follower_ids: followingIds,
    });
    if (edgesErr) throw new Error(edgesErr.message);
    const edges = (edgesRows ?? []) as Array<{ follower_id: string; following_id: string }>;
    for (const edge of edges) {
      const candidateId = edge.following_id;
      if (followingSet.has(candidateId)) continue;
      fofCountByUser.set(candidateId, (fofCountByUser.get(candidateId) ?? 0) + 1);
    }
  }

  const { data: activityRows, error: activityErr } = await client
    .from("friend_feed_posts")
    .select("author_id, created_at")
    .order("created_at", { ascending: false })
    .limit(600);
  if (activityErr) throw new Error(activityErr.message);
  const activityCountByUser = new Map<string, number>();
  for (const row of (activityRows ?? []) as Array<{ author_id: string; created_at: string }>) {
    if (followingSet.has(row.author_id)) continue;
    activityCountByUser.set(row.author_id, (activityCountByUser.get(row.author_id) ?? 0) + 1);
  }

  const { data: recentProfilesRows, error: recentProfilesErr } = await client
    .from("profiles")
    .select("id, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(300);
  if (recentProfilesErr) throw new Error(recentProfilesErr.message);

  const nowTs = Date.now();
  const recencyScoreByUser = new Map<string, number>();
  for (const row of (recentProfilesRows ?? []) as Array<{ id: string; created_at: string; updated_at: string }>) {
    if (followingSet.has(row.id)) continue;
    const createdTs = Number.isFinite(new Date(row.created_at).getTime()) ? new Date(row.created_at).getTime() : 0;
    const updatedTs = Number.isFinite(new Date(row.updated_at).getTime()) ? new Date(row.updated_at).getTime() : 0;
    const ageDays = Math.max(0, (nowTs - Math.max(createdTs, updatedTs)) / (24 * 60 * 60 * 1000));
    const score = Math.max(0, 30 - Math.min(30, ageDays));
    if (score > 0) recencyScoreByUser.set(row.id, score);
  }

  const candidateIds = [...new Set([...fofCountByUser.keys(), ...activityCountByUser.keys(), ...recencyScoreByUser.keys()])];
  if (candidateIds.length === 0) return [];

  const { data: profileRows, error: profileErr } = await client
    .from("profiles")
    .select("id, username, display_name, avatar_url, instruments, created_at, updated_at")
    .in("id", candidateIds);
  if (profileErr) throw new Error(profileErr.message);

  const ranked = ((profileRows ?? []) as Array<{
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    instruments: string[] | null;
    created_at: string;
    updated_at: string;
  }>)
    .map((row) => {
      const fofScore = fofCountByUser.get(row.id) ?? 0;
      const activityScore = activityCountByUser.get(row.id) ?? 0;
      const recentScore = recencyScoreByUser.get(row.id) ?? 0;
      const randomScore = seededUnit(`${input.seed}:${row.id}`);
      const score = fofScore * 100 + activityScore * 10 + recentScore * 5 + randomScore;
      const instruments =
        Array.isArray(row.instruments) && row.instruments.length > 0
          ? row.instruments
          : [DEFAULT_PROFILE_INSTRUMENT];
      const reason: FeedFollowSuggestionItem["reason"] =
        fofScore > 0 ? "fof" : activityScore > 0 ? "activity" : "recent";
      return {
        userId: row.id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url?.trim() || null,
        instruments,
        label: formatProfileListName(row.username, row.display_name, row.id),
        reason,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  const out = ranked.slice(0, Math.max(1, input.limit));
  cacheSet(feedSuggestionsCache, cacheKey, out, FEED_SUGGESTIONS_CACHE_TTL_MS);
  return out;
}

function publicAppOriginForFeedLinks(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "";
}

type FriendFeedPostRepostSource = {
  id: string;
  body: string;
  authorId: string;
  authorUsername: string | null;
  authorDisplayName: string | null;
};

/** Visible post row for repost (RLS must allow read). */
export async function getFriendFeedPostForRepost(postId: string): Promise<FriendFeedPostRepostSource | null> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const { data: row, error } = await client
    .from("friend_feed_posts")
    .select("id, body, author_id")
    .eq("id", postId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!row) {
    return null;
  }

  const { data: prof, error: profErr } = await client
    .from("profiles")
    .select("username, display_name")
    .eq("id", row.author_id)
    .maybeSingle();

  if (profErr) {
    throw new Error(profErr.message);
  }

  return {
    id: row.id,
    body: row.body,
    authorId: row.author_id,
    authorUsername: prof?.username ?? null,
    authorDisplayName: prof?.display_name ?? null,
  };
}

function buildRepostBody(source: FriendFeedPostRepostSource): string {
  const authorLabel = formatProfileListName(
    source.authorUsername,
    source.authorDisplayName,
    source.authorId,
  );
  const origin = publicAppOriginForFeedLinks();
  const path = `/app/feed#post-${source.id}`;
  const link = origin ? `${origin}${path}` : path;
  const header = `🔄 Partilhei de ${authorLabel}\n🔗 ${link}\n\n`;
  const maxQuote = Math.max(0, FRIEND_FEED_BODY_MAX - header.length);
  let quoted = source.body;
  if (quoted.length > maxQuote) {
    quoted = quoted.slice(0, Math.max(0, maxQuote - 1)) + "…";
  }
  return header + quoted;
}

async function actorLabelForNotifications(
  client: Awaited<ReturnType<typeof createSessionBoundDataClient>>,
  actorId: string,
): Promise<string> {
  const { data } = await client.from("profiles").select("username, display_name").eq("id", actorId).maybeSingle();
  const row = data as { username: string | null; display_name: string | null } | null;
  return formatProfileListName(row?.username ?? null, row?.display_name ?? null, actorId);
}

export async function createFriendFeedPost(body: string): Promise<void> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const { error } = await client.from("friend_feed_posts").insert({
    author_id: user.id,
    body,
  });
  if (error) {
    throw new Error(error.message);
  }
}

/** Creates a new post on the current user’s feed quoting a visible post. */
export async function repostFriendFeedPostToMyFeed(sourcePostId: string): Promise<void> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }
  const source = await getFriendFeedPostForRepost(sourcePostId);
  if (!source) {
    throw new Error("Post not found or not visible.");
  }
  const body = buildRepostBody(source);
  if (body.length > FRIEND_FEED_BODY_MAX) {
    throw new Error("Shared content is too long.");
  }
  await createFriendFeedPost(body);
  try {
    const actorLabel = await actorLabelForNotifications(client, user.id);
    await createAppNotification({
      recipientId: source.authorId,
      actorId: user.id,
      type: "share",
      title: "Your post was shared",
      body: `${actorLabel} shared one of your feed posts.`,
      resourcePath: `/app/feed#feed-post-${source.id}`,
    });
  } catch {
    // Best-effort notification.
  }
}

export async function updateFriendFeedPost(input: { postId: string; body: string }): Promise<void> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const { error } = await client
    .from("friend_feed_posts")
    .update({ body: input.body })
    .eq("id", input.postId)
    .eq("author_id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteFriendFeedPost(postId: string): Promise<void> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const { error } = await client.from("friend_feed_posts").delete().eq("id", postId).eq("author_id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function listFriendFeedCommentsForPost(postId: string): Promise<FriendFeedCommentItem[]> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }
  const mutualUserIds = await loadMutuallyFollowedUserIds(client, user.id);
  const map = await fetchCommentsGroupedByPostId(client, [postId], user.id, mutualUserIds);
  return map.get(postId) ?? [];
}

export async function addFriendFeedComment(input: { postId: string; body: string }): Promise<void> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const { error } = await client.from("friend_feed_comments").insert({
    post_id: input.postId,
    author_id: user.id,
    body: input.body,
  });

  if (error) {
    throw new Error(error.message);
  }
  const { data: postRow } = await client
    .from("friend_feed_posts")
    .select("id, author_id")
    .eq("id", input.postId)
    .maybeSingle();
  if (postRow?.author_id) {
    try {
      const actorLabel = await actorLabelForNotifications(client, user.id);
      await createAppNotification({
        recipientId: postRow.author_id,
        actorId: user.id,
        type: "comment",
        title: "New comment on your post",
        body: `${actorLabel} commented on your feed post.`,
        resourcePath: `/app/feed#feed-post-${postRow.id}`,
      });
    } catch {
      // Best-effort notification.
    }
  }
}

export async function deleteFriendFeedComment(commentId: string): Promise<void> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const { error } = await client.from("friend_feed_comments").delete().eq("id", commentId).eq("author_id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function listFriendFeedPostLikers(postId: string): Promise<FriendFeedPostLikerItem[]> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const { data, error } = await client.rpc("list_friend_feed_post_likers", { p_post_id: postId });
  if (error) {
    throw new Error(error.message);
  }
  const mutualUserIds = await loadMutuallyFollowedUserIds(client, user.id);
  const rows = (data ?? []) as RpcLikerRow[];
  return rows.map((r) => ({
    userId: r.user_id,
    username: r.username,
    displayName: r.display_name,
    avatarUrl: r.avatar_url?.trim() || null,
    likedAt: r.liked_at,
    canOpenActivitiesPage: canOpenUserActivitiesPage(user.id, r.user_id, mutualUserIds),
  }));
}

export async function toggleFriendFeedPostLike(postId: string): Promise<{ liked: boolean; likeCount: number }> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const { data: existing } = await client
    .from("friend_feed_post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await client
      .from("friend_feed_post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await client.from("friend_feed_post_likes").insert({ post_id: postId, user_id: user.id });
    if (error) {
      throw new Error(error.message);
    }
    const { data: postRow } = await client
      .from("friend_feed_posts")
      .select("id, author_id")
      .eq("id", postId)
      .maybeSingle();
    if (postRow?.author_id) {
      try {
        const actorLabel = await actorLabelForNotifications(client, user.id);
        await createAppNotification({
          recipientId: postRow.author_id,
          actorId: user.id,
          type: "like",
          title: "New like on your post",
          body: `${actorLabel} liked your feed post.`,
          resourcePath: `/app/feed#feed-post-${postRow.id}`,
        });
      } catch {
        // Best-effort notification.
      }
    }
  }

  const { count, error: countErr } = await client
    .from("friend_feed_post_likes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);
  if (countErr) {
    throw new Error(countErr.message);
  }

  return { liked: !existing, likeCount: count ?? 0 };
}
