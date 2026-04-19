/**
 * Lightweight Open Graph / basic HTML meta extraction (no full DOM parser).
 * Used only on server-fetched HTML snippets.
 */

export type ParsedLinkMeta = {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
};

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number.parseInt(n, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    });
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Match meta property=... content=... or reversed order. */
function metaContent(html: string, prop: string): string | null {
  const esc = prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${esc}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*property=["']${esc}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${esc}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*name=["']${esc}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeBasicEntities(m[1].trim());
  }
  return null;
}

function titleTag(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (!m?.[1]) return null;
  const t = stripTags(decodeBasicEntities(m[1].trim()));
  return t || null;
}

function resolveUrl(base: string, candidate: string | null): string | null {
  if (!candidate?.trim()) return null;
  const c = candidate.trim();
  try {
    return new URL(c, base).href;
  } catch {
    return null;
  }
}

export function parseLinkPreviewMeta(html: string, pageUrl: string): ParsedLinkMeta {
  const ogTitle = metaContent(html, "og:title");
  const twTitle = metaContent(html, "twitter:title");
  const title = ogTitle || twTitle || titleTag(html);

  const ogDesc = metaContent(html, "og:description");
  const twDesc = metaContent(html, "twitter:description");
  const description = metaContent(html, "description") || ogDesc || twDesc;

  const ogImage = metaContent(html, "og:image");
  const twImage = metaContent(html, "twitter:image");
  const imageRaw = ogImage || twImage;
  const imageUrl = resolveUrl(pageUrl, imageRaw);

  const siteName = metaContent(html, "og:site_name");

  return {
    title: title ? stripTags(title) : null,
    description: description ? stripTags(description) : null,
    imageUrl,
    siteName: siteName ? stripTags(siteName) : null,
  };
}
