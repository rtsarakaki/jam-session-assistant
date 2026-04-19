import "server-only";

import { parseLinkPreviewMeta } from "@/lib/platform/link-preview-meta";
import type { LinkPreviewData } from "@/lib/platform/link-preview-types";

const MAX_BYTES = 512_000;
const MAX_HTML_SCAN = 140_000;

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h === "0.0.0.0") return true;
  if (h.endsWith(".local")) return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
  }
  return false;
}

function normalizeInputUrl(raw: string): URL | null {
  const t = raw.trim();
  if (!t || t.length > 2048) return null;
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return null;
  }
  if (u.protocol === "http:") {
    try {
      u = new URL(t.replace(/^http:/i, "https:"));
    } catch {
      return null;
    }
  }
  if (u.protocol !== "https:") return null;
  if (isBlockedHost(u.hostname)) return null;
  return u;
}

export async function fetchLinkPreview(
  rawUrl: string,
): Promise<{ ok: true; data: LinkPreviewData } | { ok: false; error: string }> {
  const u = normalizeInputUrl(rawUrl);
  if (!u) {
    return { ok: false, error: "Invalid or blocked URL." };
  }

  try {
    const res = await fetch(u.href, {
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; JamSession/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    let finalUrl: URL;
    try {
      finalUrl = new URL(res.url);
    } catch {
      return { ok: false, error: "Invalid response URL." };
    }
    if (finalUrl.protocol !== "https:" || isBlockedHost(finalUrl.hostname)) {
      return { ok: false, error: "Blocked URL." };
    }

    if (!res.ok) {
      return { ok: false, error: `Could not fetch page (${res.status}).` };
    }

    const ct = res.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml\+xml/i.test(ct)) {
      return { ok: false, error: "Preview only works for HTML pages." };
    }

    const reader = res.body?.getReader();
    if (!reader) {
      return { ok: false, error: "Empty response." };
    }

    const decoder = new TextDecoder();
    let total = 0;
    let html = "";
    while (true) {
      const { done, value } = await reader.read();
      if (value) {
        total += value.length;
        if (total > MAX_BYTES) break;
        html += decoder.decode(value, { stream: !done });
        if (/<\/head>/i.test(html) && html.length > 8_000) break;
        if (html.length > MAX_HTML_SCAN) break;
      }
      if (done) break;
    }

    const canonical = finalUrl.href;
    const meta = parseLinkPreviewMeta(html, canonical);
    return {
      ok: true,
      data: {
        url: canonical,
        title: meta.title,
        description: meta.description,
        imageUrl: meta.imageUrl,
        siteName: meta.siteName,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fetch failed.";
    return { ok: false, error: msg };
  }
}
