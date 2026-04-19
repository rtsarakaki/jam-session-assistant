import "server-only";

import { createSessionBoundDataClient } from "@/lib/platform/database";

type SessionRow = {
  id: string;
  title: string;
  created_by: string;
  status: string;
};

type ParticipantJoinRow = {
  id: string;
  profile_id: string;
  profiles:
    | {
        id: string;
        username: string | null;
        display_name: string | null;
        avatar_url: string | null;
      }
    | {
        id: string;
        username: string | null;
        display_name: string | null;
        avatar_url: string | null;
      }[]
    | null;
};

type ProfileRelation = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url?: string | null;
};

type SongRelation = {
  id: string;
  title: string;
  artist: string;
  lyrics_url: string | null;
  listen_url: string | null;
};

type SessionSongJoinRow = {
  id: string;
  song_id: string;
  order_index: number;
  played_at: string | null;
  songs:
    | {
        id: string;
        title: string;
        artist: string;
        lyrics_url: string | null;
        listen_url: string | null;
      }
    | {
        id: string;
        title: string;
        artist: string;
        lyrics_url: string | null;
        listen_url: string | null;
      }[]
    | null;
};

type JoinRequestJoinRow = {
  id: string;
  requester_id: string;
  status: string;
  profiles:
    | {
        id: string;
        username: string | null;
        display_name: string | null;
      }
    | {
        id: string;
        username: string | null;
        display_name: string | null;
      }[]
    | null;
};

type SongRequestRow = {
  song_id: string;
  requester_id: string;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export type JamSessionDetails = {
  sessionId: string;
  title: string;
  createdBy: string;
  viewerId: string;
  isOwner: boolean;
  isParticipant: boolean;
  participants: Array<{ id: string; label: string; avatarUrl: string | null; isFollowing: boolean }>;
  songs: Array<{
    id: string;
    songId: string;
    title: string;
    artist: string;
    lyricsUrl: string | null;
    listenUrl: string | null;
    playedAt: string | null;
    knownByProfileIds: string[];
    knownByCount: number;
    participantCoverage: number;
    playCount: number;
    requestCount: number;
    requestedByViewer: boolean;
    score: number;
  }>;
  pendingJoinRequests: Array<{ id: string; requesterId: string; requesterLabel: string }>;
  myJoinRequestStatus: "none" | "pending" | "approved" | "rejected";
};

function profileLabel(profile: { username: string | null; display_name: string | null } | null, fallbackId: string): string {
  const display = profile?.display_name?.trim();
  if (display) return display;
  const username = profile?.username?.trim();
  if (username) return `@${username}`;
  return fallbackId.slice(0, 8);
}

export async function getJamSessionDetails(sessionId: string): Promise<JamSessionDetails> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: sessionData, error: sessionError } = await client
    .from("jam_sessions")
    .select("id, title, created_by, status")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessionError) throw new Error(sessionError.message);
  if (!sessionData) throw new Error("Session not found.");
  const session = sessionData as SessionRow;

  const { data: participantRows, error: participantError } = await client
    .from("jam_session_participants")
    .select("id, profile_id, profiles:profile_id(id, username, display_name, avatar_url)")
    .eq("session_id", sessionId);
  if (participantError) throw new Error(participantError.message);

  const { data: followingRows, error: followingError } = await client
    .from("profile_follows")
    .select("following_id")
    .eq("follower_id", user.id);
  if (followingError) throw new Error(followingError.message);
  const followingSet = new Set((followingRows ?? []).map((row) => (row as { following_id: string }).following_id));

  const participants = ((participantRows ?? []) as ParticipantJoinRow[]).map((row) => ({
    id: row.profile_id,
    label: profileLabel(firstRelation<ProfileRelation>(row.profiles), row.profile_id),
    avatarUrl: firstRelation<ProfileRelation>(row.profiles)?.avatar_url?.trim() || null,
    isFollowing: followingSet.has(row.profile_id),
  }));

  const { data: songsRows, error: songsError } = await client
    .from("jam_session_songs")
    .select("id, song_id, order_index, played_at, songs:song_id(id, title, artist, lyrics_url, listen_url)")
    .eq("session_id", sessionId)
    .order("order_index", { ascending: true });
  if (songsError) throw new Error(songsError.message);

  const songs = ((songsRows ?? []) as SessionSongJoinRow[])
    .map((row) => ({
      row,
      song: firstRelation<SongRelation>(row.songs),
    }))
    .filter(({ song }) => !!song)
    .map((row) => ({
      id: row.row.id,
      songId: row.row.song_id,
      title: row.song!.title,
      artist: row.song!.artist,
      lyricsUrl: row.song!.lyrics_url,
      listenUrl: row.song!.listen_url,
      playedAt: row.row.played_at,
    }));

  const participantIds = participants.map((participant) => participant.id);
  const sessionSongIds = songs.map((song) => song.songId);

  const { data: repertoireRows, error: repertoireError } = await client
    .from("repertoire_songs")
    .select("profile_id, song_id")
    .in("profile_id", participantIds)
    .in("song_id", sessionSongIds);
  if (repertoireError) throw new Error(repertoireError.message);

  const { data: statsRows, error: statsError } = await client
    .from("song_play_stats_for_my_jams")
    .select("song_id, play_count")
    .in("song_id", sessionSongIds);
  if (statsError) throw new Error(statsError.message);

  const { data: requestRows, error: requestError } = await client
    .from("jam_session_song_requests")
    .select("song_id, requester_id")
    .eq("session_id", sessionId);
  if (requestError) throw new Error(requestError.message);

  const knownBySong = new Map<string, Set<string>>();
  for (const row of (repertoireRows ?? []) as Array<{ profile_id: string; song_id: string }>) {
    const set = knownBySong.get(row.song_id) ?? new Set<string>();
    set.add(row.profile_id);
    knownBySong.set(row.song_id, set);
  }

  const playCountBySong = new Map<string, number>();
  for (const row of (statsRows ?? []) as Array<{ song_id: string; play_count: number | string }>) {
    const playCount = typeof row.play_count === "number" ? row.play_count : Number(row.play_count || 0);
    playCountBySong.set(row.song_id, playCount);
  }

  const requestCountBySong = new Map<string, number>();
  const requestedByViewerSet = new Set<string>();
  for (const row of (requestRows ?? []) as SongRequestRow[]) {
    requestCountBySong.set(row.song_id, (requestCountBySong.get(row.song_id) ?? 0) + 1);
    if (row.requester_id === user.id) requestedByViewerSet.add(row.song_id);
  }

  const participantCount = Math.max(1, participantIds.length);
  const songsWithScore = songs.map((song) => {
    const knownByCount = (knownBySong.get(song.songId) ?? new Set<string>()).size;
    const participantCoverage = knownByCount / participantCount;
    const participantScore = participantCoverage * 80;
    const playCount = playCountBySong.get(song.songId) ?? 0;
    const historyScore = 20 / (1 + playCount);
    const requestCount = requestCountBySong.get(song.songId) ?? 0;
    const requestScore = Math.min(20, requestCount * 4);
    const score = Number((participantScore + historyScore + requestScore).toFixed(2));
    return {
      ...song,
      knownByProfileIds: [...(knownBySong.get(song.songId) ?? new Set<string>())],
      knownByCount,
      participantCoverage,
      playCount,
      requestCount,
      requestedByViewer: requestedByViewerSet.has(song.songId),
      score,
    };
  });

  const { data: requestsRows, error: requestsError } = await client
    .from("jam_session_join_requests")
    .select("id, requester_id, status, profiles:requester_id(id, username, display_name)")
    .eq("session_id", sessionId);
  if (requestsError) throw new Error(requestsError.message);

  const requests = (requestsRows ?? []) as JoinRequestJoinRow[];
  const pendingJoinRequests = requests
    .filter((r) => r.status === "pending")
    .map((r) => ({
      id: r.id,
      requesterId: r.requester_id,
      requesterLabel: profileLabel(firstRelation<ProfileRelation>(r.profiles), r.requester_id),
    }));

  const myRequest = requests.find((r) => r.requester_id === user.id);
  const myJoinRequestStatus =
    myRequest?.status === "pending" || myRequest?.status === "approved" || myRequest?.status === "rejected"
      ? (myRequest.status as "pending" | "approved" | "rejected")
      : "none";

  const isOwner = session.created_by === user.id;
  const isParticipant = participants.some((p) => p.id === user.id);

  return {
    sessionId: session.id,
    title: session.title,
    createdBy: session.created_by,
    viewerId: user.id,
    isOwner,
    isParticipant,
    participants,
    songs: songsWithScore,
    pendingJoinRequests,
    myJoinRequestStatus,
  };
}
