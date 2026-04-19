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

export type JamSongSuggestion = {
  songId: string;
  title: string;
  artist: string;
  language: string;
  playCount: number;
  lastPlayedAt: string | null;
};

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
