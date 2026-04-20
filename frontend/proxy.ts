import { NextResponse, type NextRequest } from "next/server";
/** Relative import: keeps Edge proxy off `@/lib/platform/*` (Vercel flags that graph as unsupported). */
import { getMiddlewareAuth } from "./lib/supabase/middleware-auth";

function canUseLocalDevAutoLogin(request: NextRequest): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.DEV_AUTH_BYPASS_ENABLED !== "1") return false;
  const host = request.nextUrl.hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1";
}

export async function proxy(request: NextRequest) {
  const { user, response: supabaseResponse, hasAuthConfig } = await getMiddlewareAuth(request);

  const pathname = request.nextUrl.pathname;

  if (!hasAuthConfig) {
    if (pathname === "/app" || pathname.startsWith("/app/")) {
      return NextResponse.redirect(new URL("/auth/login?next=/app", request.url));
    }
    return supabaseResponse;
  }

  if (pathname === "/app" || pathname.startsWith("/app/")) {
    if (!user) {
      if (canUseLocalDevAutoLogin(request)) {
        const devLogin = new URL("/auth/dev-login", request.url);
        devLogin.searchParams.set("next", pathname);
        return NextResponse.redirect(devLogin);
      }
      const login = new URL("/auth/login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
    return supabaseResponse;
  }

  if (
    pathname.startsWith("/auth/login") ||
    pathname.startsWith("/auth/signup") ||
    pathname.startsWith("/auth/dev-login") ||
    pathname.startsWith("/auth/forgot-password")
  ) {
    if (user) {
      return NextResponse.redirect(new URL("/app", request.url));
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/auth/google")) {
    if (user) {
      return NextResponse.redirect(new URL("/app", request.url));
    }
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/app",
    "/app/:path*",
    "/auth/login",
    "/auth/signup",
    "/auth/google",
    "/auth/dev-login",
    "/auth/forgot-password",
    "/auth/reset-password/confirm",
  ],
};
