const FILE_ID_RE = /^[a-zA-Z0-9_-]{10,100}$/;

function isLikelyDriveFileId(id: string): boolean {
  return FILE_ID_RE.test(id);
}

/**
 * Extracts Google Drive file id for the official /preview embed.
 * Supports /file/d/…, /file/u/0/d/…, and /open?id=… on drive.google.com,
 * plus docs.google.com/uc?export=…&id=… (common share/download links).
 */
export function parseGoogleDriveFileId(raw: string): string | null {
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

  if (host === "drive.google.com") {
    const fromPath = u.pathname.match(/\/file\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/);
    const id = fromPath?.[1];
    if (id && isLikelyDriveFileId(id)) return id;

    if (u.pathname === "/open" || u.pathname.startsWith("/open/")) {
      const openId = u.searchParams.get("id");
      if (openId && isLikelyDriveFileId(openId)) return openId;
    }
  }

  if (host === "docs.google.com" && u.pathname === "/uc") {
    const ucId = u.searchParams.get("id");
    if (ucId && isLikelyDriveFileId(ucId)) return ucId;
  }

  return null;
}

/** Official Drive preview player (audio + video) for use inside an iframe. */
export function googleDrivePreviewEmbedSrc(fileId: string): string {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
}
