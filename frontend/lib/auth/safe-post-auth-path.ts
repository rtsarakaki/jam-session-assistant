/** Default route after sign-in when no safe `next` is provided. */
export const DEFAULT_LOGGED_IN_PATH = "/app";

/**
 * Returns a same-origin path under `/app` only (open-redirect safe).
 * Accepts `/app` or `/app/...`; anything else falls back to {@link DEFAULT_LOGGED_IN_PATH}.
 */
export function safePostAuthPath(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_LOGGED_IN_PATH;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return DEFAULT_LOGGED_IN_PATH;
  if (t.includes("://") || t.includes("\\")) return DEFAULT_LOGGED_IN_PATH;
  if (t === "/app" || t.startsWith("/app/")) return t;
  return DEFAULT_LOGGED_IN_PATH;
}
