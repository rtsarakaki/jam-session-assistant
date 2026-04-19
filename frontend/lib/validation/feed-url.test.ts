import { describe, expect, it } from "vitest";
import { extractFirstHttpUrl, trimUrlSuffix } from "@/lib/validation/feed-url";

describe("trimUrlSuffix", () => {
  it("removes trailing punctuation", () => {
    expect(trimUrlSuffix("https://a.com/x.")).toBe("https://a.com/x");
    expect(trimUrlSuffix("https://a.com/x)")).toBe("https://a.com/x");
  });
});

describe("extractFirstHttpUrl", () => {
  it("returns null when none", () => {
    expect(extractFirstHttpUrl("hello world")).toBeNull();
  });

  it("finds first url", () => {
    expect(extractFirstHttpUrl("see https://ex.com/a and https://b.com")).toBe("https://ex.com/a");
  });

  it("trims trailing bracket from url", () => {
    expect(extractFirstHttpUrl("link (https://x.com/path)")).toBe("https://x.com/path");
  });
});
