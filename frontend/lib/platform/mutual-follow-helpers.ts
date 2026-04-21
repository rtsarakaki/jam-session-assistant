import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/** Users that `myUserId` follows who also follow `myUserId` back (excluding self). */
export async function loadMutuallyFollowedUserIds(client: SupabaseClient, myUserId: string): Promise<Set<string>> {
  const [outgoing, incoming] = await Promise.all([
    client.from("profile_follows").select("following_id").eq("follower_id", myUserId),
    client.from("profile_follows").select("follower_id").eq("following_id", myUserId),
  ]);

  if (outgoing.error) throw new Error(outgoing.error.message);
  if (incoming.error) throw new Error(incoming.error.message);

  const iFollow = new Set((outgoing.data ?? []).map((r: { following_id: string }) => r.following_id));
  const mutual = new Set<string>();
  for (const r of (incoming.data ?? []) as { follower_id: string }[]) {
    if (iFollow.has(r.follower_id)) {
      mutual.add(r.follower_id);
    }
  }
  return mutual;
}

/** Only when the viewer and the target follow each other (mutual). */
export function canOpenUserActivitiesPage(viewerId: string, targetUserId: string, mutualUserIds: Set<string>): boolean {
  if (targetUserId === viewerId) return false;
  return mutualUserIds.has(targetUserId);
}
