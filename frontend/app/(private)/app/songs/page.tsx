import { SongsPanel } from "@/app/(private)/app/songs/SongsPanel";
import { DEFAULT_APP_LOCALE } from "@/lib/i18n/locales";
import { getMyProfile } from "@/lib/platform/profile-service";
import { getMyRepertoireSnapshot } from "@/lib/platform/repertoire-service";
import { getSongCatalog } from "@/lib/platform/songs-service";

export const metadata = {
  title: "Músicas — Jam Session",
};

export default async function SongsPage() {
  const [catalog, repertoire, profile] = await Promise.all([getSongCatalog(), getMyRepertoireSnapshot(), getMyProfile()]);
  const locale = profile?.preferredLocale ?? DEFAULT_APP_LOCALE;
  return (
    <SongsPanel
      locale={locale}
      initialSongs={catalog}
      initialRepertoireLinks={repertoire.entries.map((e) => ({ songId: e.songId, repertoireEntryId: e.id }))}
    />
  );
}
