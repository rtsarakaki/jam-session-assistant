import "server-only";

import { createSessionBoundDataClient } from "@/lib/platform/database";

export type SongCatalogItem = {
  id: string;
  title: string;
  artist: string;
  language: string;
  lyricsUrl: string | null;
  listenUrl: string | null;
  canEdit: boolean;
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
  created_by: string;
};

function mapSongRow(row: SongRow, myUserId: string | null): SongCatalogItem {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    language: row.language ?? "en",
    lyricsUrl: row.lyrics_url,
    listenUrl: row.listen_url,
    canEdit: !!myUserId && row.created_by === myUserId,
  };
}

/** Loads song catalog from DB (table: `songs`) ordered by artist/title. */
export async function getSongCatalog(): Promise<SongCatalogItem[]> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  const myUserId = user?.id ?? null;
  const { data, error } = await client
    .from("songs")
    .select("id, title, artist, language, lyrics_url, listen_url, created_by")
    .order("artist", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    // Keep UI usable while schema is being rolled out.
    if ((error as { code?: string }).code === "42P01") return [];
    throw new Error(error.message);
  }

  return ((data ?? []) as SongRow[]).map((row) => mapSongRow(row, myUserId));
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
    .select("id, title, artist, language, lyrics_url, listen_url, created_by")
    .single();

  if (error) {
    if ((error as { code?: string }).code === "42P01") {
      throw new Error("Songs table is missing. Run latest Supabase migrations.");
    }
    throw new Error(error.message);
  }

  return mapSongRow(data as SongRow, user.id);
}

export type UpdateSongCatalogInput = {
  songId: string;
  title: string;
  artist: string;
  language: string;
  lyricsUrl?: string;
  listenUrl?: string;
};

export type UpdateSongCatalogResult =
  | { mode: "updated"; song: SongCatalogItem }
  | { mode: "pending" };

/** Updates song directly if author; otherwise records a pending edit request. */
export async function updateSongCatalogItem(input: UpdateSongCatalogInput): Promise<UpdateSongCatalogResult> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: songRow, error: songErr } = await client.from("songs").select("created_by").eq("id", input.songId).single();
  if (songErr) throw new Error(songErr.message);

  const createdBy = (songRow as { created_by: string }).created_by;
  if (createdBy !== user.id) {
    const { error: requestError } = await client
      .from("songs_edit_requests")
      .upsert(
        {
          song_id: input.songId,
          requester_id: user.id,
          proposed_title: input.title,
          proposed_artist: input.artist,
          proposed_language: input.language,
          proposed_lyrics_url: input.lyricsUrl ?? null,
          proposed_listen_url: input.listenUrl ?? null,
          status: "pending",
          reviewed_by: null,
          reviewed_at: null,
        },
        { onConflict: "song_id,requester_id" },
      );
    if (requestError) throw new Error(requestError.message);
    return { mode: "pending" };
  }

  const { data, error } = await client
    .from("songs")
    .update({
      title: input.title,
      artist: input.artist,
      language: input.language,
      lyrics_url: input.lyricsUrl ?? null,
      listen_url: input.listenUrl ?? null,
    })
    .eq("id", input.songId)
    .select("id, title, artist, language, lyrics_url, listen_url, created_by")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { mode: "updated", song: mapSongRow(data as SongRow, user.id) };
}
