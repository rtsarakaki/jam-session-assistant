import { describe, expect, it } from "vitest";
import { parseYouTubeVideoId, youtubeEmbedSrc } from "@/lib/validation/youtube-url";

const VID = "dQw4w9WgXcQ";

describe("parseYouTubeVideoId", () => {
  it("parses watch URL", () => {
    expect(parseYouTubeVideoId(`https://www.youtube.com/watch?v=${VID}`)).toBe(VID);
    expect(parseYouTubeVideoId(`https://youtube.com/watch?v=${VID}&t=12`)).toBe(VID);
  });

  it("parses youtu.be", () => {
    expect(parseYouTubeVideoId(`https://youtu.be/${VID}`)).toBe(VID);
  });

  it("parses embed path", () => {
    expect(parseYouTubeVideoId(`https://www.youtube.com/embed/${VID}`)).toBe(VID);
  });

  it("parses shorts and live paths", () => {
    expect(parseYouTubeVideoId(`https://www.youtube.com/shorts/${VID}`)).toBe(VID);
    expect(parseYouTubeVideoId(`https://www.youtube.com/live/${VID}`)).toBe(VID);
  });

  it("parses m.youtube and music host", () => {
    expect(parseYouTubeVideoId(`https://m.youtube.com/watch?v=${VID}`)).toBe(VID);
    expect(parseYouTubeVideoId(`https://music.youtube.com/watch?v=${VID}`)).toBe(VID);
  });

  it("returns null for non-youtube or invalid id length", () => {
    expect(parseYouTubeVideoId("https://example.com")).toBeNull();
    expect(parseYouTubeVideoId("https://www.youtube.com/watch?v=short")).toBeNull();
  });
});

describe("youtubeEmbedSrc", () => {
  it("builds nocookie embed URL", () => {
    expect(youtubeEmbedSrc(VID)).toBe(`https://www.youtube-nocookie.com/embed/${VID}`);
  });
});
