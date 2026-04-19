import { describe, expect, it } from "vitest";
import { normalizeUsername, validateUsername } from "@/lib/validation/username";

describe("normalizeUsername", () => {
  it("trims and lowercases", () => {
    expect(normalizeUsername("  Ana_Costa  ")).toBe("ana_costa");
  });
});

describe("validateUsername", () => {
  it("accepts valid handle", () => {
    expect(validateUsername("jazz_keys_42")).toBeNull();
  });

  it("rejects empty", () => {
    expect(validateUsername("   ")).toBe("Please enter a username.");
  });

  it("rejects short", () => {
    expect(validateUsername("ab")).toContain("at least");
  });

  it("rejects invalid characters", () => {
    expect(validateUsername("no spaces")).toContain("lowercase");
    expect(validateUsername("bad@case")).toContain("lowercase");
  });

  it("rejects reserved", () => {
    expect(validateUsername("admin")).toBe("This username is reserved.");
  });
});
