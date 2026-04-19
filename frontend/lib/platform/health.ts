import "server-only";

import { pingSupabaseAuth } from "@/lib/supabase/server";

/** Verificação de conectividade ao serviço de auth configurado (hoje: Supabase). */
export { pingSupabaseAuth as pingAuthService };
