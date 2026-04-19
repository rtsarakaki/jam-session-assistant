import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { AuthUser } from "@/lib/platform/types";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

/** Um `getUser()` por pedido React Server quando layout e páginas precisam do utilizador. */
export const getCachedAuthUser = cache(async (): Promise<AuthUser | null> => {
  const client = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  return user;
});

export async function requireAuthUser(): Promise<AuthUser> {
  const user = await getCachedAuthUser();
  if (!user) {
    redirect("/auth/login?next=/app");
  }
  return user;
}
