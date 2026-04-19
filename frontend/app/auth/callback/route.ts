import { type NextRequest, NextResponse } from "next/server";
import { resolvePublicAppOrigin } from "@/lib/auth/public-app-origin";
import { safePostAuthPath } from "@/lib/auth/safe-post-auth-path";
import { createOAuthRouteSession, redirectPreservingAuthCookies } from "@/lib/platform/oauth-routes";

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
    const { supabase, cookieResponse } = createOAuthRouteSession(request);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    const cookies = cookieResponse();

    if (error) {
      return oauthErrorRedirect(url, next);
    }

    const base = resolvePublicAppOrigin(request);
    const destination = `${base}${next}`;

    return redirectPreservingAuthCookies(destination, cookies);
  } catch {
    return oauthErrorRedirect(url, next);
  }
}
