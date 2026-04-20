"use client";

import { logout } from "@/lib/actions/auth-actions";
import type { AppLocale } from "@/lib/i18n/locales";
import { clearAllOnboardingSessionFlags } from "@/lib/onboarding/walkthrough-session";

type LogoutFormProps = {
  className?: string;
  locale?: AppLocale;
};

/** Server-rendered form that ends the Supabase session and redirects to login. */
export function LogoutForm({ className, locale = "en" }: LogoutFormProps) {
  return (
    <form
      action={logout}
      onSubmit={() => {
        clearAllOnboardingSessionFlags();
      }}
    >
      <button
        type="submit"
        className={`inline-flex items-center justify-center rounded-lg border border-[#2a3344] bg-transparent px-4 py-2 text-sm font-semibold text-[#e8ecf4] transition-colors hover:border-[color-mix(in_srgb,#f87171_45%,#2a3344)] hover:bg-[#1e2533] hover:text-[#fca5a5] ${className ?? ""}`}
      >
        {locale === "pt" ? "Sair" : "Sign out"}
      </button>
    </form>
  );
}
