import { type NextRequest, NextResponse } from "next/server";
import { safePostAuthPath } from "@/lib/auth/safe-post-auth-path";
import { createSupabaseAuthForRouteHandler, redirectWithAuthCookies } from "@/lib/supabase/auth-route-handler";

function oauthErrorRedirect(origin: string, next: string, source: "signup" | "login") {
  const path = source === "signup" ? "/auth/signup" : "/auth/login";
  const u = new URL(path, origin);
  u.searchParams.set("error", "oauth");
  if (source === "login") {
    u.searchParams.set("next", next);
  }
  return NextResponse.redirect(u);
}

/**
 * Starts Google OAuth (PKCE). Supabase sets short-lived cookies; then we redirect to Google.
 * Configure the Google provider and redirect URLs in the Supabase Dashboard.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const next = safePostAuthPath(request.nextUrl.searchParams.get("next"));
  const source = request.nextUrl.searchParams.get("source") === "signup" ? "signup" : "login";

  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", next);
  if (source === "signup") {
    callback.searchParams.set("source", "signup");
  }

  try {
    const { supabase, cookieResponse } = createSupabaseAuthForRouteHandler(request);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback.toString(),
      },
    });

    const cookies = cookieResponse();

    if (error || !data.url) {
      return oauthErrorRedirect(origin, next, source);
    }

    return redirectWithAuthCookies(data.url, cookies);
  } catch {
    return oauthErrorRedirect(origin, next, source);
  }
}
