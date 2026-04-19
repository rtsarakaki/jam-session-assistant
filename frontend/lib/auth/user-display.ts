import type { User } from "@supabase/supabase-js";

export function getDisplayName(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const full = meta?.full_name;
  const display = meta?.display_name;
  if (typeof full === "string" && full.trim()) return full.trim();
  if (typeof display === "string" && display.trim()) return display.trim();
  const email = user.email?.trim();
  if (email) {
    const local = email.split("@")[0];
    if (local) return local;
  }
  return "visitante";
}

/** OAuth / profile picture URLs from common Supabase metadata keys. */
export function getAvatarImageUrl(user: User): string | null {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  for (const key of ["avatar_url", "picture", "avatar"] as const) {
    const v = meta?.[key];
    if (typeof v === "string" && /^https?:\/\//i.test(v.trim())) {
      return v.trim();
    }
  }
  return null;
}

export function getAvatarInitials(displayName: string, email: string | undefined): string {
  const base = displayName.trim() || email?.trim() || "?";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0];
    const b = parts[parts.length - 1]?.[0];
    if (a && b) return (a + b).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length === 1) {
    return parts[0].toUpperCase();
  }
  if (email && email.includes("@")) {
    return email[0]!.toUpperCase();
  }
  return "?";
}
