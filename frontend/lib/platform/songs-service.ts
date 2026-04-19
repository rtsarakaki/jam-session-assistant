import "server-only";

import { createSessionBoundDataClient } from "@/lib/platform/database";

export type SongCatalogItem = {
  id: string;
  title: string;
  artist: string;
  language: string;
  lyricsUrl: string | null;
  listenUrl: string | null;
};

type SongRow = {
  id: string;
  title: string;
  artist: string;
  language: string | null;
  lyrics_url: string | null;
  listen_url: string | null;
};

/** Loads song catalog from DB (table: `songs`) ordered by artist/title. */
export async function getSongCatalog(): Promise<SongCatalogItem[]> {
  const client = await createSessionBoundDataClient();
  const { data, error } = await client
    .from("songs")
    .select("id, title, artist, language, lyrics_url, listen_url")
    .order("artist", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    // Keep UI usable while schema is being rolled out.
    if ((error as { code?: string }).code === "42P01") return [];
    throw new Error(error.message);
  }

  return ((data ?? []) as SongRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    language: row.language ?? "en",
    lyricsUrl: row.lyrics_url,
    listenUrl: row.listen_url,
  }));
}
