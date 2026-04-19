export const FRIEND_FEED_BODY_MAX = 4000;

export type FriendFeedBodyResult =
  | { ok: true; body: string }
  | { ok: false; error: string };

/** Trim and validate feed post body (plain text, URLs allowed inside). */
export function normalizeFriendFeedBody(input: string): FriendFeedBodyResult {
  const body = input.trim();
  if (!body) {
    return { ok: false, error: "Message cannot be empty." };
  }
  if (body.length > FRIEND_FEED_BODY_MAX) {
    return { ok: false, error: `Message must be at most ${FRIEND_FEED_BODY_MAX} characters.` };
  }
  return { ok: true, body };
}
