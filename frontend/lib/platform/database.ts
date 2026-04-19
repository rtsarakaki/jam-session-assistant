import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

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
