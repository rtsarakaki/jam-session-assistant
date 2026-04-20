import { type NextRequest, NextResponse } from "next/server";
import { createOAuthRouteSession, redirectPreservingAuthCookies } from "@/lib/platform/oauth-routes";

/**
 * Dedicated password-recovery confirm callback.
 * Handles both OAuth-style `code` and OTP-style `token_hash` links, then redirects to reset form.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

  try {
    const { supabase, cookieResponse } = createOAuthRouteSession(request);
    let error: { message?: string } | null = null;

    if (code) {
      const res = await supabase.auth.exchangeCodeForSession(code);
      error = res.error;
    } else if (tokenHash && type) {
      const res = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as "recovery" | "email" | "invite" | "email_change",
      });
      error = res.error;
    } else {
      return NextResponse.redirect(new URL("/auth/forgot-password?error=invalid_reset_link", request.url));
    }

    if (error) {
      return NextResponse.redirect(new URL("/auth/forgot-password?error=invalid_reset_link", request.url));
    }

    return redirectPreservingAuthCookies(new URL("/auth/reset-password", request.url), cookieResponse());
  } catch {
    return NextResponse.redirect(new URL("/auth/forgot-password?error=invalid_reset_link", request.url));
  }
}
