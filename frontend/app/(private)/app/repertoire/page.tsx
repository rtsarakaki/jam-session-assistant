import { RepertoirePanel } from "@/app/(private)/app/repertoire/RepertoirePanel";
import { DEFAULT_APP_LOCALE } from "@/lib/i18n/locales";
import { getMyProfile } from "@/lib/platform/profile-service";
import { getMyRepertoireSnapshot } from "@/lib/platform/repertoire-service";

export const metadata = {
  title: "Repertório — Jam Session",
};

export default async function RepertoirePage() {
  const snapshot = await getMyRepertoireSnapshot();
  const profile = await getMyProfile();
  const locale = profile?.preferredLocale ?? DEFAULT_APP_LOCALE;
  return <RepertoirePanel initialCatalog={snapshot.catalog} initialEntries={snapshot.entries} locale={locale} />;
}
