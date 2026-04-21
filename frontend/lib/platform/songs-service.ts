import "server-only";

import { createSessionBoundDataClient } from "@/lib/platform/database";
import { notifyAllProfilesNewSong } from "@/lib/platform/notifications-service";

export type SongCatalogItem = {
  id: string;
  title: string;
  artist: string;
  language: string;
  lyricsUrl: string | null;
  listenUrl: string | null;
  /** Distinct profiles with this song in repertoire (whole app). */
  musiciansInRepertoire: number;
  /** Distinct jam sessions where the song was marked as played (whole app). */
  playSessionsCount: number;
  /** Owner may change title, artist, language, and URLs. */
  canEdit: boolean;
  /** Any signed-in user may update lyrics/listen URLs (name fields stay with the owner). */
  canEditLinks: boolean;
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

type RpcRepertoireCountRow = { song_id: string; profile_count: number };
type RpcPlaySessionCountRow = { song_id: string; session_count: number };

function isRpcMissing(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | undefined;
  if (e?.code === "42883" || e?.code === "PGRST202") return true;
  const msg = (e?.message ?? "").toLowerCase();
  return msg.includes("function") && (msg.includes("does not exist") || msg.includes("not found"));
}

async function fetchMusiciansInRepertoireBySongId(
  client: Awaited<ReturnType<typeof createSessionBoundDataClient>>,
  songIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const unique = [...new Set(songIds)].filter(Boolean);
  if (unique.length === 0) return map;
  const { data, error } = await client.rpc("repertoire_linked_profiles_counts", { p_song_ids: unique });
  if (error) {
    if (isRpcMissing(error)) return map;
    throw new Error(error.message);
  }
  for (const row of (data ?? []) as RpcRepertoireCountRow[]) {
    map.set(row.song_id, row.profile_count);
  }
  return map;
}

async function fetchPlaySessionsCountBySongId(
  client: Awaited<ReturnType<typeof createSessionBoundDataClient>>,
  songIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const unique = [...new Set(songIds)].filter(Boolean);
  if (unique.length === 0) return map;
  const { data, error } = await client.rpc("song_play_session_counts", { p_song_ids: unique });
  if (error) {
    if (isRpcMissing(error)) return map;
    throw new Error(error.message);
  }
  for (const row of (data ?? []) as RpcPlaySessionCountRow[]) {
    map.set(row.song_id, row.session_count);
  }
  return map;
}

function mapSongRow(
  row: SongRow,
  myUserId: string | null,
  stats?: { musiciansInRepertoire: number; playSessionsCount: number },
): SongCatalogItem {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    language: row.language ?? "en",
    lyricsUrl: row.lyrics_url,
    listenUrl: row.listen_url,
    musiciansInRepertoire: stats?.musiciansInRepertoire ?? 0,
    playSessionsCount: stats?.playSessionsCount ?? 0,
    canEdit: !!myUserId && row.created_by === myUserId,
    canEditLinks: !!myUserId,
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

  const rows = (data ?? []) as SongRow[];
  const ids = rows.map((r) => r.id);
  const [musiciansMap, playsMap] = await Promise.all([
    fetchMusiciansInRepertoireBySongId(client, ids),
    fetchPlaySessionsCountBySongId(client, ids),
  ]);

  return rows.map((row) =>
    mapSongRow(row, myUserId, {
      musiciansInRepertoire: musiciansMap.get(row.id) ?? 0,
      playSessionsCount: playsMap.get(row.id) ?? 0,
    }),
  );
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

  const item = mapSongRow(data as SongRow, user.id, { musiciansInRepertoire: 0, playSessionsCount: 0 });
  void notifyAllProfilesNewSong({
    actorId: user.id,
    songId: item.id,
    songTitle: item.title,
    songArtist: item.artist,
    lyricsUrl: item.lyricsUrl,
    listenUrl: item.listenUrl,
  }).catch(() => {
    // Best-effort; song row is already committed.
  });
  return item;
}

export type UpdateSongCatalogInput = {
  songId: string;
  title: string;
  artist: string;
  language: string;
  lyricsUrl?: string;
  listenUrl?: string;
};

export type UpdateSongCatalogResult = { song: SongCatalogItem };

function sameSongLanguage(a: string | null | undefined, b: string | null | undefined): boolean {
  return String(a ?? "en").trim().toLowerCase() === String(b ?? "en").trim().toLowerCase();
}

/** Owner: full update. Others: lyrics_url and listen_url only (title/artist/language must match DB). */
export async function updateSongCatalogItem(input: UpdateSongCatalogInput): Promise<UpdateSongCatalogResult> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: existing, error: fetchErr } = await client
    .from("songs")
    .select("id, title, artist, language, lyrics_url, listen_url, created_by")
    .eq("id", input.songId)
    .single();

  if (fetchErr) throw new Error(fetchErr.message);

  const row = existing as SongRow;
  const title = input.title.trim();
  const artist = input.artist.trim();

  if (row.created_by !== user.id) {
    if (row.title !== title || row.artist !== artist || !sameSongLanguage(row.language, input.language)) {
      throw new Error(
        "Only the song owner can change the title, artist, or language. You can still update the lyrics and listen links.",
      );
    }

    const { data, error } = await client
      .from("songs")
      .update({
        lyrics_url: input.lyricsUrl ?? null,
        listen_url: input.listenUrl ?? null,
      })
      .eq("id", input.songId)
      .select("id, title, artist, language, lyrics_url, listen_url, created_by")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const [musiciansMap, playsMap] = await Promise.all([
      fetchMusiciansInRepertoireBySongId(client, [input.songId]),
      fetchPlaySessionsCountBySongId(client, [input.songId]),
    ]);
    return {
      song: mapSongRow(data as SongRow, user.id, {
        musiciansInRepertoire: musiciansMap.get(input.songId) ?? 0,
        playSessionsCount: playsMap.get(input.songId) ?? 0,
      }),
    };
  }

  const { data, error } = await client
    .from("songs")
    .update({
      title,
      artist,
      language: input.language || "en",
      lyrics_url: input.lyricsUrl ?? null,
      listen_url: input.listenUrl ?? null,
    })
    .eq("id", input.songId)
    .select("id, title, artist, language, lyrics_url, listen_url, created_by")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const [musiciansMap, playsMap] = await Promise.all([
    fetchMusiciansInRepertoireBySongId(client, [input.songId]),
    fetchPlaySessionsCountBySongId(client, [input.songId]),
  ]);
  return {
    song: mapSongRow(data as SongRow, user.id, {
      musiciansInRepertoire: musiciansMap.get(input.songId) ?? 0,
      playSessionsCount: playsMap.get(input.songId) ?? 0,
    }),
  };
}

/** Deletes a song from catalog. RLS/policies decide whether current user is allowed. */
export async function deleteSongCatalogItem(songId: string): Promise<void> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { error } = await client.from("songs").delete().eq("id", songId);
  if (error) throw new Error(error.message);
}
