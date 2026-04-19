import "server-only";

import { createSessionBoundDataClient } from "@/lib/platform/database";

export type RepertoireLevel = "ADVANCED" | "LEARNING";

export type CatalogSongOption = {
  id: string;
  title: string;
  artist: string;
  language: string;
};

export type RepertoireEntry = {
  id: string;
  songId: string;
  title: string;
  artist: string;
  language: string;
  level: RepertoireLevel;
};

export type RepertoireSnapshot = {
  catalog: CatalogSongOption[];
  entries: RepertoireEntry[];
};

type CatalogSongRow = {
  id: string;
  title: string;
  artist: string;
  language: string | null;
};

type RepertoireJoinRow = {
  id: string;
  song_id: string;
  level: string;
  songs: CatalogSongRow | CatalogSongRow[] | null;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/** Loads current user's repertoire rows plus catalog options. */
export async function getMyRepertoireSnapshot(): Promise<RepertoireSnapshot> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: catalogRows, error: catalogErr } = await client
    .from("songs")
    .select("id, title, artist, language")
    .order("artist", { ascending: true })
    .order("title", { ascending: true });
  if (catalogErr) throw new Error(catalogErr.message);

  const { data: repRows, error: repErr } = await client
    .from("repertoire_songs")
    .select("id, song_id, level, songs:song_id(id, title, artist, language)")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });
  if (repErr) throw new Error(repErr.message);

  const catalog = ((catalogRows ?? []) as CatalogSongRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    language: row.language ?? "en",
  }));

  const entries = ((repRows ?? []) as RepertoireJoinRow[])
    .map((row) => ({
      row,
      song: firstRelation<CatalogSongRow>(row.songs),
    }))
    .filter(({ song }) => !!song)
    .map(({ row, song }) => {
      const level: RepertoireLevel = row.level === "ADVANCED" ? "ADVANCED" : "LEARNING";
      return {
        id: row.id,
        songId: row.song_id,
        title: song!.title,
        artist: song!.artist,
        language: song!.language ?? "en",
        level,
      };
    });

  return { catalog, entries };
}

export async function addSongToMyRepertoire(input: { songId: string; level: RepertoireLevel }): Promise<{ id: string }> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data, error } = await client
    .from("repertoire_songs")
    .insert({
      profile_id: user.id,
      song_id: input.songId,
      level: input.level,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: (data as { id: string }).id };
}

export async function removeSongFromMyRepertoire(input: { repertoireEntryId: string }): Promise<void> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await client
    .from("repertoire_songs")
    .delete()
    .eq("id", input.repertoireEntryId)
    .eq("profile_id", user.id);
  if (error) throw new Error(error.message);
}

export async function updateSongLevelInMyRepertoire(input: { repertoireEntryId: string; level: RepertoireLevel }): Promise<void> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await client
    .from("repertoire_songs")
    .update({ level: input.level })
    .eq("id", input.repertoireEntryId)
    .eq("profile_id", user.id);
  if (error) throw new Error(error.message);
}
