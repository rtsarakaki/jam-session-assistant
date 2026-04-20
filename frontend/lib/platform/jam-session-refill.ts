import "server-only";

import { buildJamEffectiveKnownByList, jamParticipantKnownRollup, profilePlaysAnySongInJam } from "@/lib/jam/jam-known-by-score";
import { createAdminDataClient, createSessionBoundDataClient } from "@/lib/platform/database";

type SupabaseClient = Awaited<ReturnType<typeof createSessionBoundDataClient>>;

type ParticipantInstrumentsRow = {
  profile_id: string;
  profiles:
    | { instruments?: string[] | null }
    | { instruments?: string[] | null }[]
    | null;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function fetchAllSongIds(client: SupabaseClient): Promise<string[]> {
  const pageSize = 1000;
  const out: string[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client.from("songs").select("id").range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    out.push(...(data as { id: string }[]).map((r) => r.id));
    if (data.length < pageSize) break;
  }
  return out;
}

function playCountBySongForHost(
  rows: readonly { song_id: string; session_id: string }[],
): Map<string, number> {
  const perSongSessions = new Map<string, Set<string>>();
  for (const row of rows) {
    const set = perSongSessions.get(row.song_id) ?? new Set<string>();
    set.add(row.session_id);
    perSongSessions.set(row.song_id, set);
  }
  const counts = new Map<string, number>();
  for (const [songId, set] of perSongSessions) counts.set(songId, set.size);
  return counts;
}

/**
 * When a session song is marked played, append the best-scoring catalog song
 * not already in the session (same formula as session ranking).
 */
export async function refillJamSessionPoolAfterSongMarkedPlayed(sessionId: string): Promise<void> {
  const client = await createSessionBoundDataClient();

  const { data: sessionRow, error: sessionError } = await client
    .from("jam_sessions")
    .select("id, created_by")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessionError) throw new Error(sessionError.message);
  if (!sessionRow) return;
  const sessionOwnerId = (sessionRow as { created_by: string }).created_by;

  const { data: participantRows, error: participantError } = await client
    .from("jam_session_participants")
    .select("profile_id, profiles:profile_id(instruments)")
    .eq("session_id", sessionId);
  if (participantError) throw new Error(participantError.message);

  const participantIds = ((participantRows ?? []) as ParticipantInstrumentsRow[]).map((r) => r.profile_id);
  if (participantIds.length === 0) return;

  const playsAnyById = new Map(
    ((participantRows ?? []) as ParticipantInstrumentsRow[]).map((row) => {
      const prof = firstRelation(row.profiles);
      const instruments = Array.isArray(prof?.instruments) ? prof.instruments : [];
      return [row.profile_id, profilePlaysAnySongInJam(instruments)] as const;
    }),
  );

  const { data: sessionSongRows, error: sessionSongsError } = await client
    .from("jam_session_songs")
    .select("song_id")
    .eq("session_id", sessionId);
  if (sessionSongsError) throw new Error(sessionSongsError.message);
  const inSession = new Set((sessionSongRows ?? []).map((r: { song_id: string }) => r.song_id));

  const allSongIds = await fetchAllSongIds(client);
  const candidates = allSongIds.filter((id) => !inSession.has(id));
  if (candidates.length === 0) return;

  const { data: repRows, error: repError } = await client
    .from("repertoire_songs")
    .select("profile_id, song_id")
    .in("profile_id", participantIds);
  if (repError) throw new Error(repError.message);

  const knownBySong = new Map<string, Set<string>>();
  for (const row of (repRows ?? []) as Array<{ profile_id: string; song_id: string }>) {
    const set = knownBySong.get(row.song_id) ?? new Set<string>();
    set.add(row.profile_id);
    knownBySong.set(row.song_id, set);
  }

  const { data: ownerSessions, error: ownerSessionsError } = await client
    .from("jam_sessions")
    .select("id")
    .eq("created_by", sessionOwnerId);
  if (ownerSessionsError) throw new Error(ownerSessionsError.message);
  const ownerSessionIds = ((ownerSessions ?? []) as { id: string }[]).map((r) => r.id);

  let playCountBySong = new Map<string, number>();
  if (ownerSessionIds.length > 0) {
    const sessionChunkSize = 120;
    const playedAccum: { song_id: string; session_id: string }[] = [];
    for (let i = 0; i < ownerSessionIds.length; i += sessionChunkSize) {
      const chunk = ownerSessionIds.slice(i, i + sessionChunkSize);
      const { data: playedRows, error: playedError } = await client
        .from("jam_session_songs")
        .select("song_id, session_id")
        .in("session_id", chunk)
        .not("played_at", "is", null);
      if (playedError) throw new Error(playedError.message);
      playedAccum.push(...((playedRows ?? []) as { song_id: string; session_id: string }[]));
    }
    playCountBySong = playCountBySongForHost(playedAccum);
  }

  const { data: requestRows, error: requestError } = await client
    .from("jam_session_song_requests")
    .select("song_id")
    .eq("session_id", sessionId);
  if (requestError) throw new Error(requestError.message);
  const requestCountBySong = new Map<string, number>();
  for (const row of (requestRows ?? []) as { song_id: string }[]) {
    requestCountBySong.set(row.song_id, (requestCountBySong.get(row.song_id) ?? 0) + 1);
  }

  const participantCount = Math.max(1, participantIds.length);
  let bestSongId: string | null = null;
  let bestScore = -1;

  for (const songId of candidates) {
    const repertoireIds = [...(knownBySong.get(songId) ?? new Set<string>())];
    const effective = buildJamEffectiveKnownByList(repertoireIds, participantIds, playsAnyById);
    const { participantScore } = jamParticipantKnownRollup(effective, participantCount);
    const playCount = playCountBySong.get(songId) ?? 0;
    const historyScore = 20 / (1 + playCount);
    const requestCount = requestCountBySong.get(songId) ?? 0;
    const requestScore = Math.min(20, requestCount * 4);
    const score = Number((participantScore + historyScore + requestScore).toFixed(2));
    const better = score > bestScore || (score === bestScore && bestSongId !== null && songId.localeCompare(bestSongId) < 0);
    if (better) {
      bestScore = score;
      bestSongId = songId;
    }
  }

  if (!bestSongId) return;

  const { data: orderRow, error: orderError } = await client
    .from("jam_session_songs")
    .select("order_index")
    .eq("session_id", sessionId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (orderError) throw new Error(orderError.message);
  const nextOrder =
    orderRow && typeof (orderRow as { order_index: number }).order_index === "number"
      ? (orderRow as { order_index: number }).order_index + 1
      : 0;

  const admin = createAdminDataClient();
  const { error: insertError } = await admin.from("jam_session_songs").insert({
    session_id: sessionId,
    song_id: bestSongId,
    order_index: nextOrder,
    played_at: null,
  });
  if (insertError) {
    if (insertError.code === "23505") return;
    throw new Error(insertError.message);
  }
}
