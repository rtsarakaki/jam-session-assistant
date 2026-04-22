import "server-only";

import { PROFILE_JAM_PLAYS_ANY_SONG } from "@/lib/constants/jam-profile-flags";
import { createSessionBoundDataClient } from "@/lib/platform/database";
import { formatProfileListName } from "@/lib/platform/friends-candidates";

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
  /** Distinct profiles (any user) with this song in their repertoire. */
  musiciansInRepertoire: number;
};

export type RepertoireSnapshot = {
  catalog: CatalogSongOption[];
  entries: RepertoireEntry[];
};

export type SongKnowPlayerItem = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  listName: string;
  byRepertoire: boolean;
  byAnySongFlag: boolean;
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

async function fetchMusiciansInRepertoireBySongId(
  client: Awaited<ReturnType<typeof createSessionBoundDataClient>>,
  songIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const unique = [...new Set(songIds)].filter(Boolean);
  if (unique.length === 0) return map;
  const [{ data: anySongRows, error: anySongErr }, { data: repRows, error: repErr }] = await Promise.all([
    client.from("profiles").select("id").contains("instruments", [PROFILE_JAM_PLAYS_ANY_SONG]),
    client.from("repertoire_songs").select("song_id, profile_id").in("song_id", unique),
  ]);
  if (anySongErr) throw new Error(anySongErr.message);
  if (repErr) throw new Error(repErr.message);

  const anySongProfileIds = new Set(
    ((anySongRows ?? []) as Array<{ id: string }>)
      .map((r) => r.id)
      .filter(Boolean),
  );

  const bySong = new Map<string, Set<string>>();
  for (const row of (repRows ?? []) as Array<{ song_id: string; profile_id: string }>) {
    if (!row.song_id || !row.profile_id) continue;
    const s = bySong.get(row.song_id) ?? new Set<string>();
    s.add(row.profile_id);
    bySong.set(row.song_id, s);
  }

  for (const songId of unique) {
    const s = bySong.get(songId) ?? new Set<string>();
    for (const profileId of anySongProfileIds) s.add(profileId);
    map.set(songId, s.size);
  }
  return map;
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

  const entriesBase = ((repRows ?? []) as RepertoireJoinRow[])
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

  const countBySong = await fetchMusiciansInRepertoireBySongId(
    client,
    entriesBase.map((e) => e.songId),
  );

  const entries: RepertoireEntry[] = entriesBase.map((e) => ({
    ...e,
    musiciansInRepertoire: countBySong.get(e.songId) ?? 0,
  }));

  return { catalog, entries };
}

export async function addSongToMyRepertoire(input: {
  songId: string;
  level?: RepertoireLevel;
}): Promise<{ id: string; musiciansInRepertoire: number }> {
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
      level: input.level ?? "ADVANCED",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const counts = await fetchMusiciansInRepertoireBySongId(client, [input.songId]);
  return {
    id: (data as { id: string }).id,
    musiciansInRepertoire: counts.get(input.songId) ?? 1,
  };
}

export async function removeSongFromMyRepertoire(input: {
  repertoireEntryId: string;
}): Promise<{ songId: string; musiciansInRepertoire: number }> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: row, error: selErr } = await client
    .from("repertoire_songs")
    .select("song_id")
    .eq("id", input.repertoireEntryId)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);
  if (!row) throw new Error("Repertoire entry not found.");

  const songId = (row as { song_id: string }).song_id;

  const { error } = await client
    .from("repertoire_songs")
    .delete()
    .eq("id", input.repertoireEntryId)
    .eq("profile_id", user.id);
  if (error) throw new Error(error.message);

  const counts = await fetchMusiciansInRepertoireBySongId(client, [songId]);
  return { songId, musiciansInRepertoire: counts.get(songId) ?? 0 };
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

/** People counted in "Users" for a song: repertoire link and/or "Any song (full repertoire)" profile flag. */
export async function listProfilesWhoKnowSong(songId: string): Promise<SongKnowPlayerItem[]> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const [{ data: repRows, error: repErr }, { data: anyRows, error: anyErr }] = await Promise.all([
    client.from("repertoire_songs").select("profile_id").eq("song_id", songId),
    client.from("profiles").select("id").contains("instruments", [PROFILE_JAM_PLAYS_ANY_SONG]),
  ]);
  if (repErr) throw new Error(repErr.message);
  if (anyErr) throw new Error(anyErr.message);

  const repSet = new Set(((repRows ?? []) as Array<{ profile_id: string }>).map((r) => r.profile_id).filter(Boolean));
  const anySet = new Set(((anyRows ?? []) as Array<{ id: string }>).map((r) => r.id).filter(Boolean));
  const allIds = [...new Set([...repSet, ...anySet])];
  if (allIds.length === 0) return [];

  const { data: profileRows, error: profileErr } = await client
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", allIds);
  if (profileErr) throw new Error(profileErr.message);

  const list = ((profileRows ?? []) as Array<{
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  }>).map((p) => ({
    id: p.id,
    username: p.username ?? null,
    displayName: p.display_name ?? null,
    avatarUrl: p.avatar_url?.trim() || null,
    listName: formatProfileListName(p.username, p.display_name, p.id),
    byRepertoire: repSet.has(p.id),
    byAnySongFlag: anySet.has(p.id),
  }));

  list.sort((a, b) => a.listName.localeCompare(b.listName));
  return list;
}
