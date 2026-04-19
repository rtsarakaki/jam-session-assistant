import { SongsPanel } from "@/app/(private)/app/songs/SongsPanel";
import { getSongCatalog } from "@/lib/platform/songs-service";

export const metadata = {
  title: "Songs — Jam Session Assistant",
};

export default async function SongsPage() {
  const catalog = await getSongCatalog();
  return <SongsPanel initialSongs={catalog} />;
}
