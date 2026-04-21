import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/** When `true`, `/app/user/[id]` activities are read from `user_channel_activities` instead of merged source tables. */
export const APP_FEATURE_USER_CHANNEL_ACTIVITY_LOG = "user_channel_activity_log";
export const APP_FEATURE_USER_AGENDA = "user_agenda";

type PgErrorLike = {
  code?: string;
  message?: string;
};

function isAppFeatureFlagsSchemaMissing(error: unknown): boolean {
  const e = error as PgErrorLike | undefined;
  if (e?.code === "42P01") return true;
  const msg = (e?.message ?? "").toLowerCase();
  if (!msg) return false;
  return (
    msg.includes("app_feature_flags") &&
    (msg.includes("does not exist") || msg.includes("schema cache") || msg.includes("undefined_table"))
  );
}

/**
 * Reads a boolean flag from `app_feature_flags`.
 * Returns false if the table/row is missing or `enabled` is false — safe before migrations ship.
 */
export async function readAppFeatureFlagEnabled(client: SupabaseClient, flagKey: string): Promise<boolean> {
  const { data, error } = await client.from("app_feature_flags").select("enabled").eq("flag_key", flagKey).maybeSingle();
  if (error) {
    if (isAppFeatureFlagsSchemaMissing(error)) return false;
    throw new Error(error.message);
  }
  const row = data as { enabled: boolean } | null;
  return Boolean(row?.enabled);
}
