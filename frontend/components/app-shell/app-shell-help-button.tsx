"use client";

import type { AppLocale } from "@/lib/i18n/locales";
import { ONBOARDING_OPEN_EVENT } from "@/lib/onboarding/walkthrough-session";

/** Opens the onboarding walkthrough (same as “Show tutorial” in the account menu). */
export function AppShellHelpButton({ locale }: { locale: AppLocale }) {
  const pt = locale === "pt";
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(ONBOARDING_OPEN_EVENT))}
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#2a3344] bg-[#171c26] text-[0.8rem] font-semibold text-[#d5dbe8] hover:border-[#6ee7b7]/55 hover:text-[#ffffff]"
      aria-label={pt ? "Abrir tutorial" : "Open onboarding tutorial"}
      title={pt ? "Como o app funciona" : "How this app works"}
    >
      ?
    </button>
  );
}
