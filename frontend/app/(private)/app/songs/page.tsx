import { SongsPanel } from "@/app/(private)/app/songs/SongsPanel";
import { createSongAction } from "@/app/(private)/app/songs/songs-actions";
import { getSongCatalog } from "@/lib/platform/songs-service";

export const metadata = {
  title: "Songs — Jam Session Assistant",
};

export default async function SongsPage() {
  const catalog = await getSongCatalog();
  return <SongsPanel initialSongs={catalog} onCreateSong={createSongAction} />;
}
