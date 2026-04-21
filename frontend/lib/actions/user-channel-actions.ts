"use server";

import type { UserChannelActivityItem } from "@/lib/platform/user-channel-service";
import { getUserChannelActivityPage, isUuidLike, USER_CHANNEL_PAGE_SIZE } from "@/lib/platform/user-channel-service";

export type LoadMoreUserChannelActivitiesResult = {
  error: string | null;
  items: UserChannelActivityItem[];
  hasMore: boolean;
  nextCursor: { sortAt: string; key: string } | null;
};

export async function loadMoreUserChannelActivitiesAction(input: {
  channelUserId: string;
  cursor: { sortAt: string; key: string } | null;
}): Promise<LoadMoreUserChannelActivitiesResult> {
  if (!isUuidLike(input.channelUserId)) {
    return { error: "Invalid user id.", items: [], hasMore: false, nextCursor: null };
  }
  if (input.cursor && (!input.cursor.sortAt.trim() || !input.cursor.key.trim())) {
    return { error: "Invalid cursor.", items: [], hasMore: false, nextCursor: null };
  }
  try {
    const { slice, hasMore, nextCursor } = await getUserChannelActivityPage(
      input.channelUserId,
      input.cursor,
      USER_CHANNEL_PAGE_SIZE,
    );
    return { error: null, items: slice, hasMore, nextCursor };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not load activities.",
      items: [],
      hasMore: false,
      nextCursor: null,
    };
  }
}
