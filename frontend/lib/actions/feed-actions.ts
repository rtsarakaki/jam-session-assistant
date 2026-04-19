"use server";

import { revalidatePath } from "next/cache";
import { createFriendFeedPost, listFriendFeedPostsPage } from "@/lib/platform/feed-service";
import type { FriendFeedPostItem } from "@/lib/platform/feed-service";
import { normalizeFriendFeedBody } from "@/lib/validation/friend-feed-body";

const PAGE_SIZE = 30;

export async function loadFriendFeedPageAction(input: {
  cursor: { createdAt: string; id: string } | null;
}): Promise<{
  error: string | null;
  items?: FriendFeedPostItem[];
  nextCursor?: { createdAt: string; id: string } | null;
}> {
  try {
    const { items, nextCursor } = await listFriendFeedPostsPage({
      limit: PAGE_SIZE,
      cursor: input.cursor,
    });
    return { error: null, items, nextCursor };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load feed.";
    return { error: message };
  }
}

export async function createFriendFeedPostAction(
  rawBody: string,
): Promise<{ error: string | null }> {
  const parsed = normalizeFriendFeedBody(rawBody);
  if (!parsed.ok) {
    return { error: parsed.error };
  }
  try {
    await createFriendFeedPost(parsed.body);
    revalidatePath("/app/feed");
    return { error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to post.";
    return { error: message };
  }
}
