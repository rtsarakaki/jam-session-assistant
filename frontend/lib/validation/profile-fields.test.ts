import { describe, expect, it } from "vitest";
import { PROFILE_BIO_MAX, validateProfileBio } from "./profile-fields";

describe("validateProfileBio", () => {
  it("accepts empty", () => {
    expect(validateProfileBio("")).toBeNull();
  });

  it("rejects over max length", () => {
    expect(validateProfileBio("x".repeat(PROFILE_BIO_MAX + 1))).toContain(String(PROFILE_BIO_MAX));
  });
});
