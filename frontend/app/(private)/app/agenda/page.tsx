import { AgendaPanel } from "./AgendaPanel";
import { DEFAULT_APP_LOCALE } from "@/lib/i18n/locales";
import { isAgendaFeatureEnabled, listMyAgendaEvents } from "@/lib/platform/agenda-service";
import { getMyProfile } from "@/lib/platform/profile-service";

export default async function AgendaPage() {
  const profile = await getMyProfile();
  const locale = profile?.preferredLocale ?? DEFAULT_APP_LOCALE;
  const agendaEnabled = await isAgendaFeatureEnabled();
  if (!agendaEnabled) {
    return (
      <main className="w-full min-w-0 max-w-full overflow-x-hidden">
        <h2 className="m-0 text-lg font-semibold text-[#e8ecf4]">{locale === "pt" ? "Agenda" : "Agenda"}</h2>
        <p className="mt-2 text-sm text-[#8b95a8]">
          {locale === "pt"
            ? "A Agenda ainda não está disponível neste ambiente."
            : "Agenda is not available in this environment yet."}
        </p>
      </main>
    );
  }
  const events = await listMyAgendaEvents();
  return (
    <main className="w-full min-w-0 max-w-full overflow-x-hidden">
      <h2 className="m-0 text-lg font-semibold text-[#e8ecf4]">{locale === "pt" ? "Agenda" : "Agenda"}</h2>
      <p className="mt-1 text-[0.7rem] leading-snug text-[#8b95a8]">
        {locale === "pt"
          ? "Publique seus shows, eventos que vai participar ou recomendações para amigos."
          : "Publish your gigs, events you will attend, or recommendations for friends."}
      </p>
      <div className="mt-4">
        <AgendaPanel locale={locale} initialItems={events} />
      </div>
    </main>
  );
}
