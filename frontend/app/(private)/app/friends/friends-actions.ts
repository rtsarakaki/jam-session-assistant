"use server";

import { revalidatePath } from "next/cache";
import { friendsFollowMutationInitialState, type FriendsFollowMutationState } from "@/app/(private)/app/friends/friends-follow-state";
import { createSessionBoundDataClient } from "@/lib/platform/database";

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertTargetUserId(raw: string | null | undefined): string | null {
  const id = raw?.trim();
  if (!id || !uuidRe.test(id)) return null;
  return id;
}

export async function mutateFollowAction(
  _prev: FriendsFollowMutationState,
  formData: FormData,
): Promise<FriendsFollowMutationState> {
  const intent = formData.get("intent")?.toString();
  const targetId = assertTargetUserId(formData.get("targetUserId")?.toString());
  if (!targetId) {
    return { error: "Invalid user." };
  }

  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    return { error: "Not signed in." };
  }
  if (targetId === user.id) {
    return { error: "You cannot change follow state for yourself." };
  }

  if (intent === "unfollow") {
    const { error } = await client
      .from("profile_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", targetId);

    if (error) {
      return { error: error.message };
    }
    revalidatePath("/app/friends");
    return friendsFollowMutationInitialState;
  }

  if (intent === "follow") {
    const { error } = await client.from("profile_follows").insert({
      follower_id: user.id,
      following_id: targetId,
    });

    if (error) {
      if (error.code === "23505") {
        return friendsFollowMutationInitialState;
      }
      return { error: error.message };
    }
    revalidatePath("/app/friends");
    return friendsFollowMutationInitialState;
  }

  return { error: "Invalid action." };
}
