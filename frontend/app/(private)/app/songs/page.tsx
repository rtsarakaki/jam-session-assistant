import { SongsPanel } from "@/app/(private)/app/songs/SongsPanel";
import { getMyRepertoireSnapshot } from "@/lib/platform/repertoire-service";
import { getSongCatalog } from "@/lib/platform/songs-service";

export const metadata = {
  title: "Músicas — Jam Session",
};

export default async function SongsPage() {
  const [catalog, repertoire] = await Promise.all([getSongCatalog(), getMyRepertoireSnapshot()]);
  return (
    <SongsPanel
      initialSongs={catalog}
      initialRepertoireLinks={repertoire.entries.map((e) => ({ songId: e.songId, repertoireEntryId: e.id }))}
    />
  );
}
