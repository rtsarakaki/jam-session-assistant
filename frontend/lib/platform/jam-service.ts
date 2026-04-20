import "server-only";

import { createSessionBoundDataClient } from "@/lib/platform/database";

type SongRow = {
  id: string;
  title: string;
  artist: string;
  language: string | null;
  lyrics_url: string | null;
  listen_url: string | null;
};

type SongPlayStatRow = {
  song_id: string;
  play_count: number | string;
  last_played_at: string | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  instruments: string[] | null;
};
type RepertoireRow = { profile_id: string; song_id: string };
type FollowRow = { following_id: string };
type JamSessionRow = {
  id: string;
  title: string;
  status: string;
  started_at: string | null;
  created_by: string;
};

export type JamParticipantOption = {
  id: string;
  label: string;
  /** From `profiles.instruments` (presets + optional jam “any song” flag). */
  instruments: string[];
};

export type JamSuggestionSeed = {
  songId: string;
  title: string;
  artist: string;
  lyricsUrl: string | null;
  listenUrl: string | null;
  playCount: number;
  lastPlayedAt: string | null;
  knownByProfileIds: string[];
};

export type JamSuggestionSnapshot = {
  currentUser: JamParticipantOption;
  defaultSelectedParticipantIds: string[];
  songs: JamSuggestionSeed[];
  recentSessions: Array<{
    sessionId: string;
    title: string;
    status: string;
    startedAt: string | null;
  }>;
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
    .select("id, title, artist, language, lyrics_url, listen_url");
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
    .select("id, username, display_name, instruments")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  const me = (profileRows as ProfileRow | null) ?? {
    id: user.id,
    username: null,
    display_name: null,
    instruments: null,
  };
  const myInstruments = Array.isArray(me.instruments) ? me.instruments : [];
  const currentUser: JamParticipantOption = {
    id: user.id,
    label: `${profileLabel(me, user.id)} (you)`,
    instruments: myInstruments,
  };

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

  const { data: followRows, error: followError } = await client
    .from("profile_follows")
    .select("following_id")
    .eq("follower_id", user.id);
  if (followError) throw new Error(followError.message);

  const creatorIds = [user.id, ...((followRows ?? []) as FollowRow[]).map((row) => row.following_id)];

  const { data: sessionRows, error: sessionError } = await client
    .from("jam_sessions")
    .select("id, title, status, started_at, created_by")
    .in("created_by", creatorIds)
    .order("started_at", { ascending: false })
    .limit(5);
  if (sessionError) throw new Error(sessionError.message);

  const songs = (songsData ?? []) as SongRow[];
  const statsRows = (statsData ?? []) as SongPlayStatRow[];
  const repertoire = (repertoireRows ?? []) as RepertoireRow[];
  const recentSessions = ((sessionRows ?? []) as JamSessionRow[])
    .map((session) => ({
      sessionId: session.id,
      title: session.title,
      status: session.status,
      startedAt: session.started_at,
    }))
    .filter((entry): entry is { sessionId: string; title: string; status: string; startedAt: string | null } => entry !== null);

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
      lyricsUrl: song.lyrics_url,
      listenUrl: song.listen_url,
      playCount,
      lastPlayedAt: stat?.last_played_at ?? null,
      knownByProfileIds: [...(knownBySongId.get(song.id) ?? new Set<string>())],
    };
  });

  return {
    currentUser,
    defaultSelectedParticipantIds: [user.id],
    songs: songsOut,
    recentSessions,
  };
}
