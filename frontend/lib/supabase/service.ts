import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Secret key (new `sb_secret_...`) or legacy JWT `service_role` — elevated privilege.
 * @see https://supabase.com/docs/guides/api/api-keys
 */
function getSupabaseSecretKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

/**
 * Admin client: bypasses RLS. Use only in trusted server code.
 * Prefer `SUPABASE_SECRET_KEY`; `SUPABASE_SERVICE_ROLE_KEY` is the legacy JWT name.
 * Never import from Client Components or expose to the browser.
 */
export function createServiceSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const secretKey = getSupabaseSecretKey();

  if (!url || !secretKey) {
    throw new Error(
      "Missing SUPABASE_URL or a secret API key. Set SUPABASE_SECRET_KEY (recommended) or SUPABASE_SERVICE_ROLE_KEY (legacy JWT) on the server.",
    );
  }

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
