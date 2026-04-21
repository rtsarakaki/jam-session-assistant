import type { ReactNode } from "react";
import { AppShellDock } from "@/components/app-shell/app-dock";
import { AppShellHeader } from "@/components/app-shell/app-header";
import { AppOnboardingWalkthrough } from "@/components/onboarding/app-onboarding-walkthrough";
import { DEFAULT_APP_LOCALE } from "@/lib/i18n/locales";
import { requireAuthUser } from "@/lib/platform";
import { isAgendaFeatureEnabled } from "@/lib/platform/agenda-service";
import { getMyProfile } from "@/lib/platform/profile-service";

/** Authenticated shell: prototype-style header + bottom dock; `padding-bottom` clears the fixed nav. */
export default async function PrivateLayout({ children }: { children: ReactNode }) {
  const user = await requireAuthUser();
  const profile = await getMyProfile();
  const locale = profile?.preferredLocale ?? DEFAULT_APP_LOCALE;
  const agendaEnabled = await isAgendaFeatureEnabled();

  return (
    <>
      <div className="mx-auto min-h-dvh w-full min-w-0 max-w-7xl overflow-x-hidden bg-[#0f1218] bg-[radial-gradient(1200px_600px_at_10%_-10%,#1a2435_0%,#0f1218_55%)] text-[#e8ecf4] antialiased">
        <div
          className="flex min-h-dvh w-full min-w-0 max-w-full flex-col overflow-x-hidden px-3 pt-3 sm:px-4"
          style={{
            paddingBottom: "calc(3.5rem + 0.8rem + env(safe-area-inset-bottom, 0px) + 0.75rem)",
          }}
        >
          <AppShellHeader user={user} locale={locale} agendaEnabled={agendaEnabled} />
          <div className="min-h-0 w-full min-w-0 max-w-full flex-1 overflow-x-hidden">{children}</div>
        </div>
      </div>
      <AppOnboardingWalkthrough userId={user.id} locale={locale} agendaEnabled={agendaEnabled} />
      {/* Fora do contentor limitado: `position:fixed` fica sempre relativamente à viewport ao scroll */}
      <AppShellDock locale={locale} />
    </>
  );
}
