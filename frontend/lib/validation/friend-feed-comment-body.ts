export const FRIEND_FEED_COMMENT_BODY_MAX = 2000;

export type FriendFeedCommentBodyResult =
  | { ok: true; body: string }
  | { ok: false; error: string };

export function normalizeFriendFeedCommentBody(input: string): FriendFeedCommentBodyResult {
  const body = input.trim();
  if (!body) {
    return { ok: false, error: "Comment cannot be empty." };
  }
  if (body.length > FRIEND_FEED_COMMENT_BODY_MAX) {
    return { ok: false, error: `Comment must be at most ${FRIEND_FEED_COMMENT_BODY_MAX} characters.` };
  }
  return { ok: true, body };
}
