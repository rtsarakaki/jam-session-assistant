import { CoversGalleryPanel } from "./CoversGalleryPanel";
import { DEFAULT_APP_LOCALE } from "@/lib/i18n/locales";
import { loadCoverGalleryPage, loadCoverGalleryViewerContext } from "@/lib/platform/cover-gallery-service";
import { getMyProfile } from "@/lib/platform/profile-service";

export const metadata = {
  title: "Covers — Jam Session",
};

type CoversPageProps = {
  searchParams: Promise<{ songId?: string; artist?: string; scope?: string }>;
};

export default async function CoversPage({ searchParams }: CoversPageProps) {
  const profile = await getMyProfile();
  const locale = profile?.preferredLocale ?? DEFAULT_APP_LOCALE;
  const viewerCtx = await loadCoverGalleryViewerContext();
  const sp = await searchParams;
  const songRaw = typeof sp.songId === "string" ? sp.songId.trim() : "";
  const artistRaw = typeof sp.artist === "string" ? sp.artist.trim() : "";
  const scopeRaw = typeof sp.scope === "string" ? sp.scope.trim() : "";
  const model = await loadCoverGalleryPage({
    songId: songRaw || null,
    artist: artistRaw || null,
    scope: scopeRaw || null,
  });
  const queryKey = `${songRaw}|${artistRaw}|${scopeRaw}`;
  return (
    <CoversGalleryPanel
      key={queryKey}
      locale={locale}
      model={model}
      viewerId={viewerCtx.viewerId}
      initialFollowingUserIds={viewerCtx.followingUserIds}
    />
  );
}
