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

function safeCallbackNext(raw: string | null): string {
  const t = (raw ?? "").trim();
  if (t === "/auth/reset-password") return t;
  return safePostAuthPath(t);
}

/** OAuth PKCE return URL: exchanges `code` for a session and sets auth cookies. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = safeCallbackNext(url.searchParams.get("next"));

  try {
    const { supabase, cookieResponse } = createOAuthRouteSession(request);
    let error: { message?: string } | null = null;
    let destinationPath = next;

    if (code) {
      const res = await supabase.auth.exchangeCodeForSession(code);
      error = res.error;
    } else if (tokenHash && type) {
      const res = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as "recovery" | "email" | "invite" | "email_change",
      });
      error = res.error;
      if (type === "recovery") {
        destinationPath = "/auth/reset-password";
      }
    } else {
      return oauthErrorRedirect(url, next);
    }

    const cookies = cookieResponse();

    if (error) {
      return oauthErrorRedirect(url, next);
    }

    const base = resolvePublicAppOrigin(request);
    const destination = `${base}${destinationPath}`;

    return redirectPreservingAuthCookies(destination, cookies);
  } catch {
    return oauthErrorRedirect(url, next);
  }
}
