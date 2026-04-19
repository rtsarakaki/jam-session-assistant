import { describe, expect, it } from "vitest";
import { DEFAULT_LOGGED_IN_PATH, safePostAuthPath } from "./safe-post-auth-path";

describe("safePostAuthPath", () => {
  it("defaults for non-string or unsafe values", () => {
    expect(safePostAuthPath(null)).toBe(DEFAULT_LOGGED_IN_PATH);
    expect(safePostAuthPath(undefined)).toBe(DEFAULT_LOGGED_IN_PATH);
    expect(safePostAuthPath(1)).toBe(DEFAULT_LOGGED_IN_PATH);
    expect(safePostAuthPath("//evil.com")).toBe(DEFAULT_LOGGED_IN_PATH);
    expect(safePostAuthPath("https://evil.com")).toBe(DEFAULT_LOGGED_IN_PATH);
    expect(safePostAuthPath("/foo")).toBe(DEFAULT_LOGGED_IN_PATH);
    expect(safePostAuthPath("/\\host")).toBe(DEFAULT_LOGGED_IN_PATH);
  });

  it("accepts /app and /app/... only", () => {
    expect(safePostAuthPath("/app")).toBe("/app");
    expect(safePostAuthPath("  /app/jam  ")).toBe("/app/jam");
    expect(safePostAuthPath("/app/songs?q=1")).toBe("/app/songs?q=1");
  });

  it("rejects other same-origin paths", () => {
    expect(safePostAuthPath("/auth/login")).toBe(DEFAULT_LOGGED_IN_PATH);
    expect(safePostAuthPath("/")).toBe(DEFAULT_LOGGED_IN_PATH);
  });
});
