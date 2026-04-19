/**
 * Tipos públicos da camada de plataforma (auth).
 * Trocar o backend: alterar o mapeamento aqui ou nos adaptadores em `lib/supabase/`.
 */
import type { User } from "@supabase/supabase-js";

export type AuthUser = User;
