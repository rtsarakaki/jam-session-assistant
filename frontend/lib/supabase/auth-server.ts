import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Supabase client bound to the current request cookies (Server Actions, Route Handlers).
 * Persists auth session via `Set-Cookie` when you call `signInWithPassword`, `signUp`, etc.
 */
export async function createSupabaseAuthServerClient() {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  if (!url || !publishableKey) {
    throw new Error(
      "Missing SUPABASE_URL or a publishable API key. Set SUPABASE_PUBLISHABLE_KEY (recommended) or SUPABASE_ANON_KEY (legacy JWT) on the server.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Cookie store may be read-only in some server contexts.
        }
      },
    },
  });
}
