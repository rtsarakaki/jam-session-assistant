const URL_RE = /https?:\/\/[^\s<>"{}|\\^`[\]()]+/gi;

/** Strip common trailing punctuation from a matched URL. */
export function trimUrlSuffix(url: string): string {
  return url.replace(/[),.;:!?[\]}>]+$/u, "");
}

/** First http(s) URL in plain text, or null. */
export function extractFirstHttpUrl(text: string): string | null {
  const re = new RegExp(URL_RE.source, URL_RE.flags);
  const m = re.exec(text);
  if (!m) return null;
  return trimUrlSuffix(m[0]);
}

/** Every http(s) URL in plain text (order preserved, de-duplicated). */
export function extractAllHttpUrlsFromText(text: string): string[] {
  const re = new RegExp(URL_RE.source, URL_RE.flags);
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const u = trimUrlSuffix(m[0]);
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}
