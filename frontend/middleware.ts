import { NextResponse, type NextRequest } from "next/server";
/** Relative import: keeps Edge middleware off `@/lib/platform/*` (Vercel flags that graph as unsupported). */
import { getMiddlewareAuth } from "./lib/supabase/middleware-auth";

export async function middleware(request: NextRequest) {
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
      const login = new URL("/auth/login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/auth/login") || pathname.startsWith("/auth/signup")) {
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
  matcher: ["/app", "/app/:path*", "/auth/login", "/auth/signup", "/auth/google"],
};
