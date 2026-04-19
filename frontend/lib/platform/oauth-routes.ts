import type { NextRequest } from "next/server";
import { createSupabaseAuthForRouteHandler, redirectWithAuthCookies } from "@/lib/supabase/auth-route-handler";

/**
 * OAuth / PKCE em Route Handlers: cookies de sessão num {@link NextResponse} mutável.
 * Rotas em `app/auth/*` devem usar isto em vez de `createServerClient` directamente.
 */
export function createOAuthRouteSession(request: NextRequest) {
  return createSupabaseAuthForRouteHandler(request);
}

export { redirectWithAuthCookies as redirectPreservingAuthCookies };
