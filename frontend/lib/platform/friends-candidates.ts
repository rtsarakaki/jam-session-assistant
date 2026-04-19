/**
 * Pure helpers for Friends → “friends of friends” suggestions (no I/O).
 */

export function formatProfileListName(
  username: string | null | undefined,
  displayName: string | null | undefined,
  userId: string,
): string {
  const u = username?.trim().toLowerCase();
  if (u) return `@${u}`;
  const t = displayName?.trim();
  if (t) return t;
  return `User ${userId.slice(0, 8)}`;
}

export function computeFriendsOfFriendsIds(
  myId: string,
  myFollowingIds: ReadonlySet<string>,
  edges: ReadonlyArray<{ followerId: string; followingId: string }>,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const edge of edges) {
    if (!myFollowingIds.has(edge.followerId)) continue;
    const tid = edge.followingId;
    if (tid === myId) continue;
    if (myFollowingIds.has(tid)) continue;
    if (seen.has(tid)) continue;
    seen.add(tid);
    out.push(tid);
  }
  return out;
}
