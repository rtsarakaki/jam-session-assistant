import { JamPanel } from "@/app/(private)/app/jam/JamPanel";
import { DEFAULT_APP_LOCALE } from "@/lib/i18n/locales";
import { getJamSuggestionSnapshot } from "@/lib/platform/jam-service";
import { getMyProfile } from "@/lib/platform/profile-service";

export const metadata = {
  title: "Jam — Jam Session",
};

export default async function JamPage() {
  const snapshot = await getJamSuggestionSnapshot();
  const profile = await getMyProfile();
  const locale = profile?.preferredLocale ?? DEFAULT_APP_LOCALE;
  return (
    <JamPanel
      locale={locale}
      currentUser={snapshot.currentUser}
      defaultSelectedParticipantIds={snapshot.defaultSelectedParticipantIds}
      songs={snapshot.songs}
      recentSessions={snapshot.recentSessions}
      mySessions={snapshot.mySessions}
    />
  );
}
