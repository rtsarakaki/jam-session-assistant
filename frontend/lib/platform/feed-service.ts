import "server-only";

import { createSessionBoundDataClient } from "@/lib/platform/database";
import { formatProfileListName } from "@/lib/platform/friends-candidates";
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
};

export type FriendFeedPostLikerItem = {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  likedAt: string;
};

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

function mapRow(r: RpcFeedRow, comments: FriendFeedCommentItem[], likes: LikeSummary): FriendFeedPostItem {
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
  };
}

function mapCommentRow(r: RpcCommentRow): FriendFeedCommentItem {
  return {
    id: r.id,
    postId: r.post_id,
    authorId: r.author_id,
    body: r.body,
    createdAt: r.created_at,
    authorUsername: r.author_username,
    authorDisplayName: r.author_display_name,
    authorAvatarUrl: r.author_avatar_url?.trim() || null,
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
  client: Awaited<ReturnType<typeof createSessionBoundDataClient>>,
  postIds: string[],
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
    const item = mapCommentRow(r);
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

/** Newest-first keyset page; visibility enforced by RLS (own posts + authors you follow). */
export async function listFriendFeedPostsPage(input: {
  limit?: number;
  cursor?: { createdAt: string; id: string } | null;
}): Promise<{ items: FriendFeedPostItem[]; nextCursor: { createdAt: string; id: string } | null }> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

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

  const rows = (data ?? []) as RpcFeedRow[];
  const hasMore = rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows;
  const postIds = pageRows.map((r) => r.id);
  const commentsByPost = await fetchCommentsGroupedByPostId(client, postIds);
  const likeByPost = await fetchLikeSummariesForPosts(client, postIds, user.id);
  const items = pageRows.map((r) =>
    mapRow(r, commentsByPost.get(r.id) ?? [], likeByPost.get(r.id) ?? { likeCount: 0, likedByMe: false }),
  );
  const tail = items[items.length - 1];
  const nextCursor =
    hasMore && tail
      ? {
          createdAt: tail.createdAt,
          id: tail.id,
        }
      : null;

  return { items, nextCursor };
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
  const source = await getFriendFeedPostForRepost(sourcePostId);
  if (!source) {
    throw new Error("Post not found or not visible.");
  }
  const body = buildRepostBody(source);
  if (body.length > FRIEND_FEED_BODY_MAX) {
    throw new Error("Shared content is too long.");
  }
  await createFriendFeedPost(body);
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
  const map = await fetchCommentsGroupedByPostId(client, [postId]);
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
  const rows = (data ?? []) as RpcLikerRow[];
  return rows.map((r) => ({
    userId: r.user_id,
    username: r.username,
    displayName: r.display_name,
    avatarUrl: r.avatar_url?.trim() || null,
    likedAt: r.liked_at,
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
