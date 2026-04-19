import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { getAvatarImageUrl, getAvatarInitials, getDisplayName } from "./user-display";

function user(partial: Partial<User> & Pick<User, "id">): User {
  return partial as User;
}

describe("getDisplayName", () => {
  it("uses full_name then display_name", () => {
    expect(
      getDisplayName(
        user({
          id: "1",
          user_metadata: { full_name: "  Ana Costa  ", display_name: "ignored" },
        }),
      ),
    ).toBe("Ana Costa");
    expect(
      getDisplayName(
        user({
          id: "1",
          user_metadata: { display_name: "  Beta  " },
        }),
      ),
    ).toBe("Beta");
  });

  it("falls back to email local part", () => {
    expect(getDisplayName(user({ id: "1", email: "  jo@example.com " }))).toBe("jo");
  });

  it("falls back to visitante", () => {
    expect(getDisplayName(user({ id: "1", email: undefined, user_metadata: {} }))).toBe("visitante");
    expect(getDisplayName(user({ id: "1", email: "@", user_metadata: {} }))).toBe("visitante");
  });
});

describe("getAvatarImageUrl", () => {
  it("returns first valid https URL from metadata", () => {
    expect(
      getAvatarImageUrl(
        user({
          id: "1",
          user_metadata: {
            avatar_url: "  https://cdn.example/a.png  ",
          },
        }),
      ),
    ).toBe("https://cdn.example/a.png");
    expect(
      getAvatarImageUrl(
        user({
          id: "1",
          user_metadata: { picture: "http://img.example/p.jpg" },
        }),
      ),
    ).toBe("http://img.example/p.jpg");
  });

  it("returns null when missing or invalid", () => {
    expect(getAvatarImageUrl(user({ id: "1", user_metadata: {} }))).toBeNull();
    expect(
      getAvatarImageUrl(user({ id: "1", user_metadata: { avatar_url: "not-a-url" } })),
    ).toBeNull();
  });
});

describe("getAvatarInitials", () => {
  it("uses two words", () => {
    expect(getAvatarInitials("Ana Maria", "a@b.co")).toBe("AM");
  });

  it("uses two chars for single long token", () => {
    expect(getAvatarInitials("Playwright", undefined)).toBe("PL");
  });

  it("uses one char for single short token", () => {
    expect(getAvatarInitials("X", undefined)).toBe("X");
  });

  it("uses two letters when display falls back to full email as one token", () => {
    expect(getAvatarInitials("", "zoe@test.dev")).toBe("ZO");
  });

  it("uses single display character when present", () => {
    expect(getAvatarInitials("z", "ignored@x.com")).toBe("Z");
  });

  it("returns ? when nothing usable", () => {
    expect(getAvatarInitials("", undefined)).toBe("?");
    expect(getAvatarInitials("   ", "")).toBe("?");
  });
});
