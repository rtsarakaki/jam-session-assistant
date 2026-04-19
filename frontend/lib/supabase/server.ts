import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

export type PingSupabaseAuthResult =
  | { ok: true; authHealth: unknown }
  | {
      ok: false;
      step: "env" | "network" | "auth";
      message: string;
      status?: number;
    };

/**
 * Calls Supabase Auth `GET /auth/v1/health` (documented check for GoTrue reachability).
 * Uses the same URL + publishable/anon key as the JS client.
 */
export async function pingSupabaseAuth(): Promise<PingSupabaseAuthResult> {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) {
    return {
      ok: false,
      step: "env",
      message:
        "Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY / SUPABASE_ANON_KEY (server environment).",
    };
  }

  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      method: "GET",
      headers: { apikey: key },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        step: "auth",
        status: res.status,
        message: text.slice(0, 400) || res.statusText,
      };
    }

    let authHealth: unknown = null;
    const ct = res.headers.get("content-type");
    if (ct?.includes("application/json")) {
      authHealth = await res.json();
    }

    return { ok: true, authHealth };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, step: "network", message };
  }
}

/**
 * Supabase client for server-only usage (Route Handlers, Server Actions,
 * Server Components). Reads `SUPABASE_PUBLISHABLE_KEY` (current docs name) or
 * `SUPABASE_ANON_KEY` (legacy JWT). No `NEXT_PUBLIC_` prefix — not in the browser bundle.
 *
 * Access respects Row Level Security unless you use {@link createServiceSupabaseClient}.
 */
export function createServerSupabaseClient() {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  if (!url || !publishableKey) {
    throw new Error(
      "Missing SUPABASE_URL or a publishable API key. Set SUPABASE_PUBLISHABLE_KEY (recommended) or SUPABASE_ANON_KEY (legacy JWT) on the server.",
    );
  }

  return createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
