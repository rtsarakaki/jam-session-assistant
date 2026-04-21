"use server";

import type { UserChannelActivityItem } from "@/lib/platform/user-channel-service";
import { getUserChannelActivityPage, isUuidLike, USER_CHANNEL_PAGE_SIZE } from "@/lib/platform/user-channel-service";

export type LoadMoreUserChannelActivitiesResult = {
  error: string | null;
  items: UserChannelActivityItem[];
  hasMore: boolean;
};

export async function loadMoreUserChannelActivitiesAction(input: {
  channelUserId: string;
  skip: number;
}): Promise<LoadMoreUserChannelActivitiesResult> {
  if (!isUuidLike(input.channelUserId)) {
    return { error: "Invalid user id.", items: [], hasMore: false };
  }
  if (!Number.isFinite(input.skip) || input.skip < 0) {
    return { error: "Invalid offset.", items: [], hasMore: false };
  }
  try {
    const { slice, hasMore } = await getUserChannelActivityPage(input.channelUserId, input.skip, USER_CHANNEL_PAGE_SIZE);
    return { error: null, items: slice, hasMore };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not load activities.",
      items: [],
      hasMore: false,
    };
  }
}
