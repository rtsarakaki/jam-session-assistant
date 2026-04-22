import { describe, expect, it } from "vitest";
import { findFirstVideoLikeUrlInBody, isVideoLikeUrl } from "@/lib/validation/feed-video-url";

describe("isVideoLikeUrl", () => {
  it("detects youtube watch", () => {
    expect(isVideoLikeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
  });

  it("detects vimeo", () => {
    expect(isVideoLikeUrl("https://vimeo.com/12345")).toBe(true);
  });

  it("detects direct mp4", () => {
    expect(isVideoLikeUrl("https://cdn.example.com/x.mp4")).toBe(true);
  });

  it("rejects plain site", () => {
    expect(isVideoLikeUrl("https://example.com/page")).toBe(false);
  });
});

describe("findFirstVideoLikeUrlInBody", () => {
  it("picks first video-like url", () => {
    const body = "see https://example.com then https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    expect(findFirstVideoLikeUrlInBody(body)).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });
});
