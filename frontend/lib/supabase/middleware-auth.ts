import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

export type MiddlewareAuthResult = {
  user: User | null;
  /** Resposta a usar quando devolves `NextResponse.next` / redirect (inclui cookies de sessão refrescados). */
  response: NextResponse;
  /** `false` quando faltam variáveis de ambiente (o middleware trata redirecionos sem sessão). */
  hasAuthConfig: boolean;
};

/**
 * Lê/refresca a sessão no Edge (middleware). Não importar `server-only` nem `next/headers` aqui.
 * Vive em `lib/supabase/` (imports relativos) para o bundle Edge na Vercel não puxar `lib/platform`.
 */
export async function getMiddlewareAuth(request: NextRequest): Promise<MiddlewareAuthResult> {
  let response = NextResponse.next({ request });

  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();

  if (!url || !key) {
    return { user: null, response, hasAuthConfig: false };
  }

  const supabase: SupabaseClient = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user, response, hasAuthConfig: true };
}
