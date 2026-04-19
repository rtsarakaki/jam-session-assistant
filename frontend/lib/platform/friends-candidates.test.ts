import { describe, expect, it } from "vitest";
import { computeFriendsOfFriendsIds, formatProfileListName } from "@/lib/platform/friends-candidates";

describe("formatProfileListName", () => {
  it("uses trimmed display name when present", () => {
    expect(formatProfileListName("  Ana  ", "uuid-1")).toBe("Ana");
  });

  it("falls back to short id prefix when display name empty", () => {
    expect(formatProfileListName(null, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")).toBe("User aaaaaaaa");
  });
});

describe("computeFriendsOfFriendsIds", () => {
  it("collects follow targets of people I follow, excluding self and direct follows", () => {
    const myId = "me";
    const following = new Set(["a", "b"]);
    const edges = [
      { followerId: "a", followingId: "x" },
      { followerId: "a", followingId: "y" },
      { followerId: "b", followingId: "me" },
      { followerId: "b", followingId: "x" },
      { followerId: "b", followingId: "a" },
    ];
    expect(computeFriendsOfFriendsIds(myId, following, edges)).toEqual(["x", "y"]);
  });

  it("returns empty when no edges", () => {
    expect(computeFriendsOfFriendsIds("me", new Set(["a"]), [])).toEqual([]);
  });

  it("ignores edges from users you do not follow", () => {
    expect(
      computeFriendsOfFriendsIds("me", new Set(["a"]), [{ followerId: "x", followingId: "z" }]),
    ).toEqual([]);
  });

  it("skips suggestions you already follow", () => {
    const following = new Set(["a", "b"]);
    const edges = [
      { followerId: "a", followingId: "b" },
      { followerId: "a", followingId: "c" },
    ];
    expect(computeFriendsOfFriendsIds("me", following, edges)).toEqual(["c"]);
  });
});
