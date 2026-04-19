/**
 * Publishable key (new `sb_publishable_...`) or legacy JWT `anon` — same role in the API.
 * @see https://supabase.com/docs/guides/api/api-keys
 */
export function getSupabasePublishableKey(): string | undefined {
  return process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
}

export function getSupabaseUrl(): string | undefined {
  const raw = process.env.SUPABASE_URL;
  if (!raw?.trim()) return undefined;
  return raw.trim().replace(/\/+$/, "");
}
