import { type NextRequest, NextResponse } from "next/server";
import { safePostAuthPath } from "@/lib/auth/safe-post-auth-path";
import { createSupabaseAuthForRouteHandler, redirectWithAuthCookies } from "@/lib/supabase/auth-route-handler";

function oauthErrorRedirect(requestUrl: URL, next: string) {
  const isSignup = requestUrl.searchParams.get("source") === "signup";
  const path = isSignup ? "/auth/signup" : "/auth/login";
  const u = new URL(path, requestUrl.origin);
  u.searchParams.set("error", "oauth");
  if (!isSignup) {
    u.searchParams.set("next", next);
  }
  return NextResponse.redirect(u);
}

/** OAuth PKCE return URL: exchanges `code` for a session and sets auth cookies. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = safePostAuthPath(url.searchParams.get("next"));

  if (!code) {
    return oauthErrorRedirect(url, next);
  }

  try {
    const { supabase, cookieResponse } = createSupabaseAuthForRouteHandler(request);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    const cookies = cookieResponse();

    if (error) {
      return oauthErrorRedirect(url, next);
    }

    const forwardedHost = request.headers.get("x-forwarded-host");
    const isLocal = process.env.NODE_ENV === "development";
    const destination =
      !isLocal && forwardedHost ? `https://${forwardedHost}${next}` : `${url.origin}${next}`;

    return redirectWithAuthCookies(destination, cookies);
  } catch {
    return oauthErrorRedirect(url, next);
  }
}
