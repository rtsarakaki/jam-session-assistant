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
  profiles: {
    id: string;
    username: string | null;
    display_name: string | null;
  } | null;
};

type SessionSongJoinRow = {
  id: string;
  song_id: string;
  order_index: number;
  played_at: string | null;
  songs: {
    id: string;
    title: string;
    artist: string;
  } | null;
};

type JoinRequestJoinRow = {
  id: string;
  requester_id: string;
  status: string;
  profiles: {
    id: string;
    username: string | null;
    display_name: string | null;
  } | null;
};

export type JamSessionDetails = {
  sessionId: string;
  title: string;
  createdBy: string;
  isOwner: boolean;
  isParticipant: boolean;
  participants: Array<{ id: string; label: string }>;
  songs: Array<{ id: string; title: string; artist: string; playedAt: string | null }>;
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
    .select("id, profile_id, profiles:profile_id(id, username, display_name)")
    .eq("session_id", sessionId);
  if (participantError) throw new Error(participantError.message);

  const participants = ((participantRows ?? []) as ParticipantJoinRow[]).map((row) => ({
    id: row.profile_id,
    label: profileLabel(row.profiles, row.profile_id),
  }));

  const { data: songsRows, error: songsError } = await client
    .from("jam_session_songs")
    .select("id, song_id, order_index, played_at, songs:song_id(id, title, artist)")
    .eq("session_id", sessionId)
    .order("order_index", { ascending: true });
  if (songsError) throw new Error(songsError.message);

  const songs = ((songsRows ?? []) as SessionSongJoinRow[])
    .filter((row) => !!row.songs)
    .map((row) => ({
      id: row.id,
      title: row.songs!.title,
      artist: row.songs!.artist,
      playedAt: row.played_at,
    }));

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
      requesterLabel: profileLabel(r.profiles, r.requester_id),
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
    isOwner,
    isParticipant,
    participants,
    songs,
    pendingJoinRequests,
    myJoinRequestStatus,
  };
}
