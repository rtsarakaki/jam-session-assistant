import "server-only";

import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient, isServiceSupabaseConfigured } from "@/lib/supabase/service";

/**
 * Cliente Postgres/PostgREST com **sessão do utilizador** (cookies).
 * Necessário para RLS com `auth.uid()` (ex.: `public.profiles`).
 */
export async function createSessionBoundDataClient() {
  return createSupabaseAuthServerClient();
}

/**
 * Acesso a dados com as permissões normais da API (RLS aplicável).
 * Usar em Server Actions / Route Handlers quando precisares de `from("tabela")` sem bypass.
 */
export function createUserDataClient() {
  return createServerSupabaseClient();
}

/**
 * Acesso elevado (ignora RLS). Só em código de confiança no servidor.
 */
export function createAdminDataClient() {
  return createServiceSupabaseClient();
}

/**
 * Service role quando as variáveis existem; caso contrário `null` (ex.: dev só com publishable).
 * Use com fallback para `createSessionBoundDataClient()` quando o score precisar funcionar sem secret.
 */
export function tryCreateAdminDataClient() {
  if (!isServiceSupabaseConfigured()) return null;
  return createServiceSupabaseClient();
}
