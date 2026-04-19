import "server-only";

import { createSessionBoundDataClient } from "@/lib/platform/database";

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
  comments: FriendFeedCommentItem[];
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

function mapRow(r: RpcFeedRow, comments: FriendFeedCommentItem[]): FriendFeedPostItem {
  return {
    id: r.id,
    authorId: r.author_id,
    body: r.body,
    createdAt: r.created_at,
    authorUsername: r.author_username,
    authorDisplayName: r.author_display_name,
    authorAvatarUrl: r.author_avatar_url?.trim() || null,
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
  return map;
}

const DEFAULT_PAGE = 30;
const MAX_PAGE = 100;

/** Newest-first keyset page; visibility enforced by RLS (own + mutual followers). */
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
  const items = pageRows.map((r) => mapRow(r, commentsByPost.get(r.id) ?? []));
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
