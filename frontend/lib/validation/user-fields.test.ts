import { describe, expect, it } from "vitest";
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  validateEmail,
  validateLoginPassword,
  validateName,
  validatePassword,
  validatePasswordMatch,
} from "./user-fields";

describe("validateName", () => {
  it("rejects empty", () => {
    expect(validateName("")).toBe("Please enter your name.");
    expect(validateName("   ")).toBe("Please enter your name.");
  });

  it("rejects too short", () => {
    expect(validateName("a")).toBe("Name must be at least 2 characters.");
  });

  it("rejects too long", () => {
    expect(validateName("x".repeat(121))).toBe("Name must be at most 120 characters.");
  });

  it("rejects digits-only", () => {
    expect(validateName("12")).toBe("Name must include at least one letter.");
  });

  it("accepts name with letter", () => {
    expect(validateName(" João ")).toBeNull();
    expect(validateName("AB")).toBeNull();
  });
});

describe("validateEmail", () => {
  it("rejects empty", () => {
    expect(validateEmail("")).toBe("Please enter your email.");
  });

  it("rejects invalid format", () => {
    expect(validateEmail("not-an-email")).toBe("Enter a valid email address.");
  });

  it("rejects too long", () => {
    const local = "a".repeat(250);
    expect(validateEmail(`${local}@x.co`)).toBe("Email is too long.");
  });

  it("normalizes and accepts valid", () => {
    expect(validateEmail("  User@Example.COM ")).toBeNull();
  });
});

describe("validateLoginPassword", () => {
  it("rejects empty", () => {
    expect(validateLoginPassword("")).toBe("Please enter your password.");
  });

  it("rejects over max length", () => {
    expect(validateLoginPassword("x".repeat(PASSWORD_MAX + 1))).toContain("at most");
  });

  it("accepts any non-empty within max", () => {
    expect(validateLoginPassword("short")).toBeNull();
    expect(validateLoginPassword("x".repeat(PASSWORD_MAX))).toBeNull();
  });
});

describe("validatePassword", () => {
  it("rejects empty", () => {
    expect(validatePassword("")).toBe("Please enter a password.");
  });

  it("enforces length", () => {
    expect(validatePassword("a1".repeat(2))).toContain(String(PASSWORD_MIN));
    expect(validatePassword("a1" + "x".repeat(PASSWORD_MAX - 1))).toContain(String(PASSWORD_MAX));
  });

  it("requires letter and number", () => {
    expect(validatePassword("abcdefgh")).toBe("Password must include at least one number.");
    expect(validatePassword("12345678")).toBe("Password must include at least one letter.");
  });

  it("accepts valid password", () => {
    expect(validatePassword(`ab12${"x".repeat(PASSWORD_MIN - 4)}`)).toBeNull();
  });
});

describe("validatePasswordMatch", () => {
  it("rejects empty confirm", () => {
    expect(validatePasswordMatch("a", "")).toBe("Please confirm your password.");
  });

  it("rejects mismatch", () => {
    expect(validatePasswordMatch("secret1", "secret2")).toBe("Passwords do not match.");
  });

  it("accepts match", () => {
    expect(validatePasswordMatch("same", "same")).toBeNull();
  });
});

describe("constants", () => {
  it("exports password bounds", () => {
    expect(PASSWORD_MIN).toBe(8);
    expect(PASSWORD_MAX).toBe(72);
  });
});
