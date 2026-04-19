import { describe, expect, it } from "vitest";
import { FRIEND_FEED_BODY_MAX, normalizeFriendFeedBody } from "@/lib/validation/friend-feed-body";

describe("normalizeFriendFeedBody", () => {
  it("rejects empty and whitespace-only", () => {
    expect(normalizeFriendFeedBody("")).toEqual({ ok: false, error: "Message cannot be empty." });
    expect(normalizeFriendFeedBody("   \n\t ")).toEqual({ ok: false, error: "Message cannot be empty." });
  });

  it("trims and accepts valid body", () => {
    expect(normalizeFriendFeedBody("  Gig tonight!  ")).toEqual({ ok: true, body: "Gig tonight!" });
  });

  it("rejects when over max length", () => {
    const long = "a".repeat(FRIEND_FEED_BODY_MAX + 1);
    expect(normalizeFriendFeedBody(long).ok).toBe(false);
  });

  it("accepts body at max length", () => {
    const s = "a".repeat(FRIEND_FEED_BODY_MAX);
    expect(normalizeFriendFeedBody(s)).toEqual({ ok: true, body: s });
  });
});
