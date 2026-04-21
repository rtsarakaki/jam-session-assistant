"use server";

import { revalidatePath } from "next/cache";
import {
  addFriendFeedComment,
  createFriendFeedPost,
  deleteFriendFeedComment,
  deleteFriendFeedPost,
  listFriendFeedCommentsForPost,
  listFriendFeedPostLikers,
  listFriendFeedPostsPage,
  repostFriendFeedPostToMyFeed,
  toggleFriendFeedPostLike,
  updateFriendFeedPost,
} from "@/lib/platform/feed-service";
import type {
  FriendFeedCommentItem,
  FriendFeedPostItem,
  FriendFeedPostLikerItem,
  FeedFollowSuggestionItem,
} from "@/lib/platform/feed-service";
import { normalizeFriendFeedCommentBody } from "@/lib/validation/friend-feed-comment-body";
import { normalizeFriendFeedBody } from "@/lib/validation/friend-feed-body";

const PAGE_SIZE = 6;

export async function loadFriendFeedPageAction(input: {
  cursor: { createdAt: string; id: string } | null;
}): Promise<{
  error: string | null;
  items?: FriendFeedPostItem[];
  followSuggestions?: FeedFollowSuggestionItem[];
  nextCursor?: { createdAt: string; id: string } | null;
}> {
  try {
    const { items, nextCursor, followSuggestions } = await listFriendFeedPostsPage({
      limit: PAGE_SIZE,
      cursor: input.cursor,
    });
    return { error: null, items, nextCursor, followSuggestions };
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

export async function updateFriendFeedPostAction(input: {
  postId: string;
  rawBody: string;
}): Promise<{ error: string | null }> {
  const parsed = normalizeFriendFeedBody(input.rawBody);
  if (!parsed.ok) {
    return { error: parsed.error };
  }
  try {
    await updateFriendFeedPost({ postId: input.postId, body: parsed.body });
    revalidatePath("/app/feed");
    return { error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update post.";
    return { error: message };
  }
}

export async function deleteFriendFeedPostAction(postId: string): Promise<{ error: string | null }> {
  try {
    await deleteFriendFeedPost(postId);
    revalidatePath("/app/feed");
    return { error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete post.";
    return { error: message };
  }
}

/** Reposts a visible feed post as a new post on the current user’s feed. */
export async function shareFriendFeedPostToMyFeedAction(sourcePostId: string): Promise<{ error: string | null }> {
  try {
    await repostFriendFeedPostToMyFeed(sourcePostId);
    revalidatePath("/app/feed");
    return { error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not share to your feed.";
    return { error: message };
  }
}

export async function addFriendFeedCommentAction(input: {
  postId: string;
  rawBody: string;
}): Promise<{ error: string | null; comments?: FriendFeedCommentItem[] }> {
  const parsed = normalizeFriendFeedCommentBody(input.rawBody);
  if (!parsed.ok) {
    return { error: parsed.error };
  }
  try {
    await addFriendFeedComment({ postId: input.postId, body: parsed.body });
    const comments = await listFriendFeedCommentsForPost(input.postId);
    revalidatePath("/app/feed");
    return { error: null, comments };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to add comment.";
    return { error: message };
  }
}

export async function deleteFriendFeedCommentAction(commentId: string): Promise<{ error: string | null }> {
  try {
    await deleteFriendFeedComment(commentId);
    revalidatePath("/app/feed");
    return { error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete comment.";
    return { error: message };
  }
}

export async function toggleFriendFeedPostLikeAction(
  postId: string,
): Promise<{ error: string | null; liked?: boolean; likeCount?: number }> {
  try {
    const { liked, likeCount } = await toggleFriendFeedPostLike(postId);
    revalidatePath("/app/feed");
    return { error: null, liked, likeCount };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not update like.";
    return { error: message };
  }
}

export async function listFriendFeedPostLikersAction(
  postId: string,
): Promise<{ error: string | null; likers?: FriendFeedPostLikerItem[] }> {
  try {
    const likers = await listFriendFeedPostLikers(postId);
    return { error: null, likers };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not load who liked this post.";
    return { error: message };
  }
}
