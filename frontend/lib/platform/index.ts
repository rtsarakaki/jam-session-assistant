/**
 * Camada de plataforma: ponto único para auth/sessão exposto à aplicação.
 * Implementação actual: `lib/supabase/*`. Para trocar de backend, mantém estas APIs e substitui os adaptadores.
 */

export type { AuthUser } from "@/lib/platform/types";
export { getCachedAuthUser, requireAuthUser } from "@/lib/platform/session";
export { signInWithPassword, signUpWithPassword, signOutGlobal } from "@/lib/platform/credentials";
export type { SignInWithPasswordInput, SignUpWithPasswordInput } from "@/lib/platform/credentials";
export { createOAuthRouteSession, redirectPreservingAuthCookies } from "@/lib/platform/oauth-routes";
export { getMiddlewareAuth, type MiddlewareAuthResult } from "@/lib/platform/middleware-session";
export { pingAuthService } from "@/lib/platform/health";
export { createUserDataClient, createAdminDataClient } from "@/lib/platform/database";
