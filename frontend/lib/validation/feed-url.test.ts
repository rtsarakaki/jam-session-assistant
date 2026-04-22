import { describe, expect, it } from "vitest";
import { extractAllHttpUrlsFromText, extractFirstHttpUrl, trimUrlSuffix } from "@/lib/validation/feed-url";

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

describe("extractAllHttpUrlsFromText", () => {
  it("returns empty when none", () => {
    expect(extractAllHttpUrlsFromText("no links")).toEqual([]);
  });

  it("lists unique urls in order", () => {
    expect(extractAllHttpUrlsFromText("a https://x.com/1 b https://y.com/2")).toEqual(["https://x.com/1", "https://y.com/2"]);
  });

  it("dedupes identical urls", () => {
    expect(extractAllHttpUrlsFromText("https://a.com same https://a.com")).toEqual(["https://a.com"]);
  });
});
