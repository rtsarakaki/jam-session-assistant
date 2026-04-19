const USERNAME_RE = /^[a-z0-9_]+$/;

const RESERVED = new Set([
  "admin",
  "administrator",
  "help",
  "jam",
  "moderator",
  "null",
  "root",
  "support",
  "system",
  "undefined",
]);

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;

/** Lowercase trim for storage; does not strip invalid characters (validate first). */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Empty string is valid only when caller treats username as optional. */
export function validateUsername(raw: string): string | null {
  const v = normalizeUsername(raw);
  if (!v) return "Please enter a username.";
  if (v.length < USERNAME_MIN) return `Username must be at least ${USERNAME_MIN} characters.`;
  if (v.length > USERNAME_MAX) return `Username must be at most ${USERNAME_MAX} characters.`;
  if (!USERNAME_RE.test(v)) {
    return "Use only lowercase letters, numbers, and underscores.";
  }
  if (RESERVED.has(v)) return "This username is reserved.";
  return null;
}
