import "server-only";

import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export type SignInWithPasswordInput = { email: string; password: string };

export type SignUpWithPasswordInput = {
  email: string;
  password: string;
  metadata: { full_name: string; display_name: string };
};

export type RequestPasswordResetInput = {
  email: string;
  redirectTo: string;
};

/**
 * Credenciais e sessão (cookies) via adaptador atual (Supabase).
 * Server Actions devem usar estas funções em vez de instanciar o cliente diretamente.
 */
export async function signInWithPassword(input: SignInWithPasswordInput) {
  const client = await createSupabaseAuthServerClient();
  return client.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
}

export async function signUpWithPassword(input: SignUpWithPasswordInput) {
  const client = await createSupabaseAuthServerClient();
  return client.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: input.metadata },
  });
}

export async function signOutGlobal() {
  const client = await createSupabaseAuthServerClient();
  return client.auth.signOut({ scope: "global" });
}

export async function requestPasswordReset(input: RequestPasswordResetInput) {
  const client = await createSupabaseAuthServerClient();
  return client.auth.resetPasswordForEmail(input.email, { redirectTo: input.redirectTo });
}

export async function updatePassword(password: string) {
  const client = await createSupabaseAuthServerClient();
  return client.auth.updateUser({ password });
}
