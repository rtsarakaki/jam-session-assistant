import "server-only";

import { createSessionBoundDataClient } from "@/lib/platform/database";

type SongRow = {
  id: string;
  title: string;
  artist: string;
  language: string | null;
};

type SongPlayStatRow = {
  song_id: string;
  play_count: number | string;
  last_played_at: string | null;
};

type ProfileRow = { id: string; username: string | null; display_name: string | null };
type RepertoireRow = { profile_id: string; song_id: string };

export type JamParticipantOption = {
  id: string;
  label: string;
};

export type JamSuggestionSeed = {
  songId: string;
  title: string;
  artist: string;
  playCount: number;
  lastPlayedAt: string | null;
  knownByProfileIds: string[];
};

export type JamSuggestionSnapshot = {
  currentUser: JamParticipantOption;
  defaultSelectedParticipantIds: string[];
  songs: JamSuggestionSeed[];
};

export type JamSongSuggestion = {
  songId: string;
  title: string;
  artist: string;
  language: string;
  playCount: number;
  lastPlayedAt: string | null;
};

function profileLabel(profile: ProfileRow, fallbackId: string): string {
  const display = profile.display_name?.trim();
  if (display) return display;
  const username = profile.username?.trim();
  if (username) return `@${username}`;
  return fallbackId.slice(0, 8);
}

/**
 * Suggests songs for next jams, prioritizing lower play count first.
 * Tie-breakers: never played first, then oldest last play date.
 */
export async function getJamSongSuggestions(limit = 25): Promise<JamSongSuggestion[]> {
  const client = await createSessionBoundDataClient();

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: songsData, error: songsError } = await client
    .from("songs")
    .select("id, title, artist, language");
  if (songsError) throw new Error(songsError.message);

  const { data: statsData, error: statsError } = await client
    .from("song_play_stats_for_my_jams")
    .select("song_id, play_count, last_played_at");
  if (statsError) throw new Error(statsError.message);

  const songs = (songsData ?? []) as SongRow[];
  const statsRows = (statsData ?? []) as SongPlayStatRow[];
  const statsBySongId = new Map<string, SongPlayStatRow>();
  for (const row of statsRows) statsBySongId.set(row.song_id, row);

  const ranked = songs
    .map((song) => {
      const stat = statsBySongId.get(song.id);
      const playCountRaw = stat?.play_count ?? 0;
      const playCount = typeof playCountRaw === "number" ? playCountRaw : Number(playCountRaw || 0);
      return {
        songId: song.id,
        title: song.title,
        artist: song.artist,
        language: song.language ?? "en",
        playCount,
        lastPlayedAt: stat?.last_played_at ?? null,
      };
    })
    .sort((a, b) => {
      if (a.playCount !== b.playCount) return a.playCount - b.playCount;
      if (a.lastPlayedAt === null && b.lastPlayedAt !== null) return -1;
      if (a.lastPlayedAt !== null && b.lastPlayedAt === null) return 1;
      if (a.lastPlayedAt && b.lastPlayedAt) {
        const dateCmp = new Date(a.lastPlayedAt).getTime() - new Date(b.lastPlayedAt).getTime();
        if (dateCmp !== 0) return dateCmp;
      }
      const artistCmp = a.artist.localeCompare(b.artist);
      return artistCmp !== 0 ? artistCmp : a.title.localeCompare(b.title);
    });

  return ranked.slice(0, Math.max(1, limit));
}

export async function getJamSuggestionSnapshot(): Promise<JamSuggestionSnapshot> {
  const client = await createSessionBoundDataClient();

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: profileRows, error: profileError } = await client
    .from("profiles")
    .select("id, username, display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  const me = (profileRows as ProfileRow | null) ?? { id: user.id, username: null, display_name: null };
  const currentUser: JamParticipantOption = { id: user.id, label: `${profileLabel(me, user.id)} (you)` };

  const { data: songsData, error: songsError } = await client
    .from("songs")
    .select("id, title, artist, language");
  if (songsError) throw new Error(songsError.message);

  const { data: statsData, error: statsError } = await client
    .from("song_play_stats_for_my_jams")
    .select("song_id, play_count, last_played_at");
  if (statsError) throw new Error(statsError.message);

  const { data: repertoireRows, error: repertoireError } = await client
    .from("repertoire_songs")
    .select("profile_id, song_id")
    .limit(20000);
  if (repertoireError) throw new Error(repertoireError.message);

  const songs = (songsData ?? []) as SongRow[];
  const statsRows = (statsData ?? []) as SongPlayStatRow[];
  const repertoire = (repertoireRows ?? []) as RepertoireRow[];

  const statsBySongId = new Map<string, SongPlayStatRow>();
  for (const row of statsRows) statsBySongId.set(row.song_id, row);

  const knownBySongId = new Map<string, Set<string>>();
  for (const row of repertoire) {
    const set = knownBySongId.get(row.song_id) ?? new Set<string>();
    set.add(row.profile_id);
    knownBySongId.set(row.song_id, set);
  }

  const songsOut: JamSuggestionSeed[] = songs.map((song) => {
    const stat = statsBySongId.get(song.id);
    const playCountRaw = stat?.play_count ?? 0;
    const playCount = typeof playCountRaw === "number" ? playCountRaw : Number(playCountRaw || 0);
    return {
      songId: song.id,
      title: song.title,
      artist: song.artist,
      playCount,
      lastPlayedAt: stat?.last_played_at ?? null,
      knownByProfileIds: [...(knownBySongId.get(song.id) ?? new Set<string>())],
    };
  });

  return {
    currentUser,
    defaultSelectedParticipantIds: [user.id],
    songs: songsOut,
  };
}
