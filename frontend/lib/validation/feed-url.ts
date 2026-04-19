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
