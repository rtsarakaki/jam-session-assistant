import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Supabase client for Route Handlers: reads request cookies and writes session cookies
 * onto a mutable {@link NextResponse} (required for OAuth PKCE + redirects).
 */
export function createSupabaseAuthForRouteHandler(request: NextRequest) {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or a publishable API key. Set SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY on the server.",
    );
  }

  let cookieResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        cookieResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  return { supabase, cookieResponse: () => cookieResponse };
}

/** HTTP redirect while forwarding `Set-Cookie` from the Supabase cookie response (PKCE / session). */
export function redirectWithAuthCookies(targetUrl: string | URL, cookieHolder: NextResponse) {
  const res = NextResponse.redirect(targetUrl);
  const headersWithGetSetCookie = cookieHolder.headers as Headers & { getSetCookie?: () => string[] };
  const list = typeof headersWithGetSetCookie.getSetCookie === "function" ? headersWithGetSetCookie.getSetCookie() : [];
  if (list.length > 0) {
    for (const line of list) {
      res.headers.append("Set-Cookie", line);
    }
    return res;
  }
  for (const c of cookieHolder.cookies.getAll()) {
    res.cookies.set(c.name, c.value);
  }
  return res;
}
