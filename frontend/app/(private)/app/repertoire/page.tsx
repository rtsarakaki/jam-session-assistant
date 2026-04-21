import { RepertoirePanel } from "@/app/(private)/app/repertoire/RepertoirePanel";
import { DEFAULT_APP_LOCALE } from "@/lib/i18n/locales";
import { getMyProfile } from "@/lib/platform/profile-service";
import { getMyRepertoireSnapshot } from "@/lib/platform/repertoire-service";

export const metadata = {
  title: "Repertório — Jam Session",
};

type RepertoirePageProps = {
  searchParams: Promise<{ addSong?: string }>;
};

export default async function RepertoirePage({ searchParams }: RepertoirePageProps) {
  const sp = await searchParams;
  const raw = sp.addSong?.trim() ?? "";
  const highlightSongId = /^[0-9a-f-]{36}$/i.test(raw) ? raw : null;
  const snapshot = await getMyRepertoireSnapshot();
  const profile = await getMyProfile();
  const locale = profile?.preferredLocale ?? DEFAULT_APP_LOCALE;
  return (
    <RepertoirePanel
      initialCatalog={snapshot.catalog}
      initialEntries={snapshot.entries}
      locale={locale}
      highlightSongId={highlightSongId}
    />
  );
}
