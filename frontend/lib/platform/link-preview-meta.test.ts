import { describe, expect, it } from "vitest";
import { parseLinkPreviewMeta } from "@/lib/platform/link-preview-meta";

describe("parseLinkPreviewMeta", () => {
  it("reads og tags and resolves relative image", () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Hello &amp; world" />
        <meta property="og:description" content="Desc here" />
        <meta property="og:image" content="/pic.png" />
        <meta property="og:site_name" content="Example" />
      </head></html>
    `;
    const r = parseLinkPreviewMeta(html, "https://example.com/page");
    expect(r.title).toBe("Hello & world");
    expect(r.description).toBe("Desc here");
    expect(r.imageUrl).toBe("https://example.com/pic.png");
    expect(r.siteName).toBe("Example");
  });

  it("falls back to title tag", () => {
    const html = "<html><head><title>Plain title</title></head></html>";
    const r = parseLinkPreviewMeta(html, "https://x.com/");
    expect(r.title).toBe("Plain title");
  });
});
