/** YouTube watch / share IDs are almost always 11 chars from this alphabet. */
const YOUTUBE_ID_RE = /^[\w-]{11}$/;

function isLikelyYoutubeVideoId(id: string): boolean {
  return YOUTUBE_ID_RE.test(id);
}

/**
 * Extracts the video id for embedding (watch, youtu.be, embed, shorts, live).
 * Returns null if the URL is not a single-video YouTube page we can embed.
 */
export function parseYouTubeVideoId(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    try {
      u = new URL(t.startsWith("http") ? t : `https://${t}`);
    } catch {
      return null;
    }
  }

  const host = u.hostname.replace(/^www\./i, "").toLowerCase();

  if (host === "youtu.be") {
    const seg = u.pathname.split("/").filter(Boolean)[0];
    return seg && isLikelyYoutubeVideoId(seg) ? seg : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const path = u.pathname;

    if (path === "/watch" || path.startsWith("/watch/")) {
      const v = u.searchParams.get("v");
      return v && isLikelyYoutubeVideoId(v) ? v : null;
    }

    if (path.startsWith("/embed/")) {
      const seg = path.slice("/embed/".length).split("/")[0];
      return seg && isLikelyYoutubeVideoId(seg) ? seg : null;
    }

    if (path.startsWith("/shorts/")) {
      const seg = path.slice("/shorts/".length).split("/")[0]?.split("?")[0];
      return seg && isLikelyYoutubeVideoId(seg) ? seg : null;
    }

    if (path.startsWith("/live/")) {
      const seg = path.slice("/live/".length).split("/")[0]?.split("?")[0];
      return seg && isLikelyYoutubeVideoId(seg) ? seg : null;
    }
  }

  return null;
}

export function youtubeEmbedSrc(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
}
