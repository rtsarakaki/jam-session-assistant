import { parseGoogleDriveFileId } from "@/lib/validation/google-drive-url";
import { extractAllHttpUrlsFromText } from "@/lib/validation/feed-url";
import { parseYouTubeVideoId } from "@/lib/validation/youtube-url";

function isVimeoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^www\./i, "").toLowerCase();
    return h === "vimeo.com" || h.endsWith(".vimeo.com");
  } catch {
    return false;
  }
}

function isDirectVideoFileUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(url);
}

/** True when the URL is likely a video we can preview (YouTube, Drive, Vimeo, or direct file). */
export function isVideoLikeUrl(url: string): boolean {
  const t = url.trim();
  if (!t) return false;
  if (parseYouTubeVideoId(t)) return true;
  if (parseGoogleDriveFileId(t)) return true;
  if (isVimeoUrl(t)) return true;
  if (isDirectVideoFileUrl(t)) return true;
  return false;
}

/** First URL in the post body that looks like a video link, or null. */
export function findFirstVideoLikeUrlInBody(body: string): string | null {
  for (const u of extractAllHttpUrlsFromText(body)) {
    if (isVideoLikeUrl(u)) return u;
  }
  return null;
}
