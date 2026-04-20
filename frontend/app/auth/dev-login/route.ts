import { NextResponse, type NextRequest } from "next/server";
import { safePostAuthPath } from "@/lib/auth/safe-post-auth-path";
import { signInWithPassword } from "@/lib/platform";

function isLocalHost(request: NextRequest): boolean {
  const host = request.nextUrl.hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1";
}

/**
 * Dev-only auto-login route for localhost experimentation.
 * Enable with DEV_AUTH_BYPASS_ENABLED=1 and provide DEV_AUTH_BYPASS_EMAIL/PASSWORD.
 */
export async function GET(request: NextRequest) {
  const disabled =
    process.env.NODE_ENV === "production" ||
    process.env.DEV_AUTH_BYPASS_ENABLED !== "1" ||
    !isLocalHost(request);
  if (disabled) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const email = process.env.DEV_AUTH_BYPASS_EMAIL?.trim().toLowerCase();
  const password = process.env.DEV_AUTH_BYPASS_PASSWORD ?? "";
  if (!email || !password) {
    return NextResponse.redirect(new URL("/auth/login?error=dev_auth_not_configured", request.url));
  }

  const { error } = await signInWithPassword({ email, password });
  if (error) {
    return NextResponse.redirect(new URL("/auth/login?error=dev_auth_failed", request.url));
  }

  const nextPath = safePostAuthPath(request.nextUrl.searchParams.get("next"));
  return NextResponse.redirect(new URL(nextPath, request.url));
}
