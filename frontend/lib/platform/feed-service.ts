import "server-only";

import { createSessionBoundDataClient } from "@/lib/platform/database";

export type FriendFeedPostItem = {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  authorUsername: string | null;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
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

function mapRow(r: RpcFeedRow): FriendFeedPostItem {
  return {
    id: r.id,
    authorId: r.author_id,
    body: r.body,
    createdAt: r.created_at,
    authorUsername: r.author_username,
    authorDisplayName: r.author_display_name,
    authorAvatarUrl: r.author_avatar_url?.trim() || null,
  };
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

  const rows = ((data ?? []) as RpcFeedRow[]).map(mapRow);
  const hasMore = rows.length > pageSize;
  const items = hasMore ? rows.slice(0, pageSize) : rows;
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
