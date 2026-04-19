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

export type CreateSongCatalogInput = {
  title: string;
  artist: string;
  language: string;
  lyricsUrl?: string;
  listenUrl?: string;
};

type SongRow = {
  id: string;
  title: string;
  artist: string;
  language: string | null;
  lyrics_url: string | null;
  listen_url: string | null;
};

function mapSongRow(row: SongRow): SongCatalogItem {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    language: row.language ?? "en",
    lyricsUrl: row.lyrics_url,
    listenUrl: row.listen_url,
  };
}

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

  return ((data ?? []) as SongRow[]).map(mapSongRow);
}

/** Creates a song in catalog and returns inserted row. */
export async function createSongCatalogItem(input: CreateSongCatalogInput): Promise<SongCatalogItem> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data, error } = await client
    .from("songs")
    .insert({
      title: input.title,
      artist: input.artist,
      language: input.language,
      lyrics_url: input.lyricsUrl ?? null,
      listen_url: input.listenUrl ?? null,
      created_by: user.id,
    })
    .select("id, title, artist, language, lyrics_url, listen_url")
    .single();

  if (error) {
    if ((error as { code?: string }).code === "42P01") {
      throw new Error("Songs table is missing. Run latest Supabase migrations.");
    }
    throw new Error(error.message);
  }

  return mapSongRow(data as SongRow);
}
