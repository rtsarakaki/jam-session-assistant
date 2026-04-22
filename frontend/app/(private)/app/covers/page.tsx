import { CoversGalleryPanel } from "./CoversGalleryPanel";
import { DEFAULT_APP_LOCALE } from "@/lib/i18n/locales";
import { loadCoverGalleryPage } from "@/lib/platform/cover-gallery-service";
import { requireAuthUser } from "@/lib/platform";
import { getMyProfile } from "@/lib/platform/profile-service";

export const metadata = {
  title: "Covers — Jam Session",
};

type CoversPageProps = {
  searchParams: Promise<{ songId?: string; artist?: string }>;
};

export default async function CoversPage({ searchParams }: CoversPageProps) {
  const user = await requireAuthUser();
  const profile = await getMyProfile();
  const locale = profile?.preferredLocale ?? DEFAULT_APP_LOCALE;
  const sp = await searchParams;
  const songRaw = typeof sp.songId === "string" ? sp.songId.trim() : "";
  const artistRaw = typeof sp.artist === "string" ? sp.artist.trim() : "";
  const model = await loadCoverGalleryPage({ songId: songRaw || null, artist: artistRaw || null });
  const queryKey = `${songRaw}|${artistRaw}`;
  return <CoversGalleryPanel key={queryKey} locale={locale} myUserId={user.id} model={model} />;
}
