import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { LogoutForm } from "@/components/auth/logout-form";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export const metadata = {
  title: "Área logada — Jam Session Assistant",
};

function nomeDeExibicao(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const full = meta?.full_name;
  const display = meta?.display_name;
  if (typeof full === "string" && full.trim()) return full.trim();
  if (typeof display === "string" && display.trim()) return display.trim();
  const email = user.email?.trim();
  if (email) {
    const local = email.split("@")[0];
    if (local) return local;
  }
  return "visitante";
}

export default async function AreaLogadaPage() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/app");
  }

  const nome = nomeDeExibicao(user);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0f1218] bg-[radial-gradient(1200px_600px_at_10%_-10%,#1a2435_0%,#0f1218_55%)] px-4 py-10 text-[#e8ecf4]">
      <main className="w-full max-w-lg rounded-xl border border-[#2a3344] bg-[#171c26] p-8 shadow-xl">
        <div className="flex flex-col gap-4 border-b border-[#2a3344] pb-6 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-[#e8ecf4]">
            Bem-vindo, <span className="text-[#6ee7b7]">{nome}</span>
          </h1>
          <LogoutForm />
        </div>
        <p className="mt-6 text-sm leading-relaxed text-[#8b95a8]">
          Esta página só é visível com sessão ativa. Mais conteúdo da aplicação virá a seguir.
        </p>
      </main>
    </div>
  );
}
