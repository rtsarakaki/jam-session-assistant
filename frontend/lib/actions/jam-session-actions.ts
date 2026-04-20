"use server";

import { revalidatePath } from "next/cache";
import { createSessionBoundDataClient } from "@/lib/platform/database";
import { formatProfileListName } from "@/lib/platform/friends-candidates";
import { createAppNotification } from "@/lib/platform/notifications-service";
import { refillJamSessionPoolAfterSongMarkedPlayed } from "@/lib/platform/jam-session-refill";

type PgErrorLike = {
  code?: string;
  message?: string;
};

function isSchemaMissing(error: unknown): boolean {
  const e = error as PgErrorLike | undefined;
  if (e?.code === "42P01" || e?.code === "42703") return true;
  const msg = (e?.message ?? "").toLowerCase();
  return msg.includes("schema cache") || msg.includes("could not find the table");
}

async function canUseSetlistSchema(client: Awaited<ReturnType<typeof createSessionBoundDataClient>>): Promise<boolean> {
  const { error } = await client.from("jam_session_setlist_choices").select("id", { head: true, count: "exact" }).limit(1);
  if (!error) return true;
  if (isSchemaMissing(error)) return false;
  throw new Error(error.message);
}

export async function createJamSessionAction(input: {
  title: string;
  participantIds: string[];
  songIds: string[];
  mode?: "suggested" | "setlist";
  setlistSongIds?: string[];
}): Promise<{ error: string | null; sessionId?: string }> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const title = input.title.trim() || `Jam ${new Date().toLocaleDateString()}`;
  const participants = [...new Set([user.id, ...input.participantIds])];
  const setlistSchemaEnabled = await canUseSetlistSchema(client);
  const useSetlistMode = input.mode === "setlist" && setlistSchemaEnabled;
  const setlistSongIds = [...new Set(input.setlistSongIds ?? [])].filter(Boolean);
  const songsToInsert = useSetlistMode ? setlistSongIds : input.songIds;
  if (participants.length < 2) {
    return { error: "A jam session needs at least 2 participants." };
  }

  const sessionInsertPayload = setlistSchemaEnabled
    ? { title, created_by: user.id, status: "PLANNED", jam_mode: useSetlistMode ? "setlist" : "suggested" }
    : { title, created_by: user.id, status: "PLANNED" };
  const { data: sessionRow, error: sessionError } = await client.from("jam_sessions").insert(sessionInsertPayload).select("id").single();
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

  if (songsToInsert.length > 0) {
    const { error: songsError } = await client.from("jam_session_songs").insert(
      songsToInsert.map((songId, index) => ({
        session_id: sessionId,
        song_id: songId,
        order_index: index,
      })),
    );
    if (songsError) return { error: songsError.message };
  }

  if (useSetlistMode && setlistSongIds.length > 0) {
    const { error: choicesError } = await client.from("jam_session_setlist_choices").insert(
      setlistSongIds.map((songId) => ({
        session_id: sessionId,
        profile_id: user.id,
        song_id: songId,
      })),
    );
    if (choicesError && !isSchemaMissing(choicesError)) return { error: choicesError.message };
  }

  const { data: creatorProfile } = await client
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .maybeSingle();
  const creatorLabel = formatProfileListName(
    creatorProfile?.username ?? null,
    creatorProfile?.display_name ?? null,
    user.id,
  );

  const { data: followerRows } = await client
    .from("profile_follows")
    .select("follower_id")
    .eq("following_id", user.id);
  const followerIds = [...new Set((followerRows ?? []).map((r) => (r as { follower_id: string }).follower_id))];
  for (const recipientId of followerIds) {
    try {
      await createAppNotification({
        recipientId,
        actorId: user.id,
        type: "jam_created",
        title: "New jam created",
        body: `${creatorLabel} created "${title}".`,
        resourcePath: `/app/jam/session/${sessionId}`,
      });
    } catch {
      // Best-effort notification; jam creation should still succeed.
    }
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

  const { data: participantRow, error: participantError } = await client
    .from("jam_session_participants")
    .select("id")
    .eq("session_id", input.sessionId)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (participantError) return { error: participantError.message };
  if (!participantRow) return { error: "Only jam participants can mark songs as played." };

  const { error } = await client
    .from("jam_session_songs")
    .update({ played_at: input.played ? new Date().toISOString() : null })
    .eq("id", input.sessionSongId);
  if (error) return { error: error.message };

  if (input.played) {
    try {
      await refillJamSessionPoolAfterSongMarkedPlayed(input.sessionId);
    } catch (e) {
      console.error("refillJamSessionPoolAfterSongMarkedPlayed failed", e);
    }
  }

  revalidatePath(`/app/jam/session/${input.sessionId}`);
  return { error: null };
}

export async function toggleJamSongRequestAction(input: {
  sessionId: string;
  songId: string;
  requested: boolean;
}): Promise<{ error: string | null }> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: participantRow, error: participantError } = await client
    .from("jam_session_participants")
    .select("id")
    .eq("session_id", input.sessionId)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (participantError) return { error: participantError.message };
  if (participantRow) return { error: "Participants should mark as played, not request." };

  if (!input.requested) {
    const { error } = await client.from("jam_session_song_requests").insert({
      session_id: input.sessionId,
      song_id: input.songId,
      requester_id: user.id,
    });
    if (error && error.code !== "23505") return { error: error.message };
  } else {
    const { error } = await client
      .from("jam_session_song_requests")
      .delete()
      .eq("session_id", input.sessionId)
      .eq("song_id", input.songId)
      .eq("requester_id", user.id);
    if (error) return { error: error.message };
  }

  revalidatePath(`/app/jam/session/${input.sessionId}`);
  return { error: null };
}

export async function setFollowFromJamAction(input: {
  targetUserId: string;
  follow: boolean;
  sessionId: string;
}): Promise<{ error: string | null }> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "Not signed in." };
  if (!input.targetUserId.trim()) return { error: "Invalid user." };
  if (input.targetUserId === user.id) return { error: "You cannot follow yourself." };

  if (input.follow) {
    const { error } = await client.from("profile_follows").insert({
      follower_id: user.id,
      following_id: input.targetUserId,
    });
    if (error && error.code !== "23505") return { error: error.message };
  } else {
    const { error } = await client
      .from("profile_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", input.targetUserId);
    if (error) return { error: error.message };
  }

  revalidatePath(`/app/jam/session/${input.sessionId}`);
  revalidatePath("/app/friends");
  return { error: null };
}

export async function addJamParticipantAction(input: {
  sessionId: string;
  profileId: string;
}): Promise<{ error: string | null }> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "Not signed in." };
  if (!input.profileId.trim()) return { error: "Invalid participant." };

  const { data: sessionRow, error: sessionError } = await client
    .from("jam_sessions")
    .select("id")
    .eq("id", input.sessionId)
    .eq("created_by", user.id)
    .maybeSingle();
  if (sessionError) return { error: sessionError.message };
  if (!sessionRow) return { error: "Only the jam owner can add participants." };

  const { error } = await client.from("jam_session_participants").upsert(
    {
      session_id: input.sessionId,
      profile_id: input.profileId,
    },
    { onConflict: "session_id,profile_id" },
  );
  if (error) return { error: error.message };

  revalidatePath(`/app/jam/session/${input.sessionId}`);
  return { error: null };
}

export async function updateJamSessionModeAction(input: {
  sessionId: string;
  mode: "suggested" | "setlist";
}): Promise<{ error: string | null }> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const setlistSchemaEnabled = await canUseSetlistSchema(client);
  if (!setlistSchemaEnabled) return { error: null };

  const { data: sessionRow, error: sessionError } = await client
    .from("jam_sessions")
    .select("id")
    .eq("id", input.sessionId)
    .eq("created_by", user.id)
    .maybeSingle();
  if (sessionError) return { error: sessionError.message };
  if (!sessionRow) return { error: "Only the jam owner can change setup mode." };

  const { error } = await client
    .from("jam_sessions")
    .update({ jam_mode: input.mode })
    .eq("id", input.sessionId);
  if (error) {
    if (isSchemaMissing(error)) return { error: null };
    return { error: error.message };
  }

  revalidatePath(`/app/jam/session/${input.sessionId}`);
  return { error: null };
}

export async function removeJamParticipantAction(input: {
  sessionId: string;
  profileId: string;
}): Promise<{ error: string | null }> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "Not signed in." };
  if (!input.profileId.trim()) return { error: "Invalid participant." };

  const { data: sessionRow, error: sessionError } = await client
    .from("jam_sessions")
    .select("id, created_by")
    .eq("id", input.sessionId)
    .eq("created_by", user.id)
    .maybeSingle();
  if (sessionError) return { error: sessionError.message };
  if (!sessionRow) return { error: "Only the jam owner can remove participants." };
  if ((sessionRow as { created_by: string }).created_by === input.profileId) {
    return { error: "The jam owner cannot be removed." };
  }

  const { error } = await client
    .from("jam_session_participants")
    .delete()
    .eq("session_id", input.sessionId)
    .eq("profile_id", input.profileId);
  if (error) return { error: error.message };

  revalidatePath(`/app/jam/session/${input.sessionId}`);
  return { error: null };
}
