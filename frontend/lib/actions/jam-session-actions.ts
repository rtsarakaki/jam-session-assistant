"use server";

import { revalidatePath } from "next/cache";
import { createSessionBoundDataClient } from "@/lib/platform/database";

export async function createJamSessionAction(input: {
  title: string;
  participantIds: string[];
  songIds: string[];
}): Promise<{ error: string | null; sessionId?: string }> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const title = input.title.trim() || `Jam ${new Date().toLocaleDateString()}`;
  const participants = [...new Set([user.id, ...input.participantIds])];

  const { data: sessionRow, error: sessionError } = await client
    .from("jam_sessions")
    .insert({ title, created_by: user.id, status: "PLANNED" })
    .select("id")
    .single();
  if (sessionError) return { error: sessionError.message };

  const sessionId = (sessionRow as { id: string }).id;

  if (participants.length > 0) {
    const { error: participantError } = await client.from("jam_session_participants").insert(
      participants.map((profileId) => ({
        session_id: sessionId,
        profile_id: profileId,
      })),
    );
    if (participantError) return { error: participantError.message };
  }

  if (input.songIds.length > 0) {
    const { error: songsError } = await client.from("jam_session_songs").insert(
      input.songIds.map((songId, index) => ({
        session_id: sessionId,
        song_id: songId,
        order_index: index,
      })),
    );
    if (songsError) return { error: songsError.message };
  }

  revalidatePath("/app/jam");
  revalidatePath(`/app/jam/session/${sessionId}`);
  return { error: null, sessionId };
}

export async function requestJoinJamSessionAction(input: { sessionId: string }): Promise<{ error: string | null }> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await client.from("jam_session_join_requests").upsert(
    {
      session_id: input.sessionId,
      requester_id: user.id,
      status: "pending",
      reviewed_at: null,
      reviewed_by: null,
    },
    { onConflict: "session_id,requester_id,status" },
  );
  if (error) return { error: error.message };

  revalidatePath(`/app/jam/session/${input.sessionId}`);
  return { error: null };
}

export async function reviewJoinJamSessionAction(input: {
  requestId: string;
  sessionId: string;
  requesterId: string;
  approve: boolean;
}): Promise<{ error: string | null }> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const status = input.approve ? "approved" : "rejected";
  const { error: updateError } = await client
    .from("jam_session_join_requests")
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", input.requestId);
  if (updateError) return { error: updateError.message };

  if (input.approve) {
    const { error: participantError } = await client.from("jam_session_participants").upsert(
      {
        session_id: input.sessionId,
        profile_id: input.requesterId,
      },
      { onConflict: "session_id,profile_id" },
    );
    if (participantError) return { error: participantError.message };
  }

  revalidatePath(`/app/jam/session/${input.sessionId}`);
  return { error: null };
}

export async function markJamSongPlayedAction(input: {
  sessionSongId: string;
  sessionId: string;
  played: boolean;
}): Promise<{ error: string | null }> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await client
    .from("jam_session_songs")
    .update({ played_at: input.played ? new Date().toISOString() : null })
    .eq("id", input.sessionSongId);
  if (error) return { error: error.message };

  revalidatePath(`/app/jam/session/${input.sessionId}`);
  return { error: null };
}
