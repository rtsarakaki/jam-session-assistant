import "server-only";

import { createSessionBoundDataClient } from "@/lib/platform/database";
import { computeFriendsOfFriendsIds, formatProfileListName } from "@/lib/platform/friends-candidates";

export type PublicProfileCard = {
  id: string;
  displayName: string | null;
  instruments: string[];
  listName: string;
};

export type FriendsSnapshot = {
  myUserId: string;
  /** Other users (excludes current user), sorted by list name. */
  directory: PublicProfileCard[];
  followingIds: string[];
  friendsOfFriendsIds: string[];
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  instruments: string[] | null;
};

function mapCard(row: ProfileRow): PublicProfileCard {
  const instruments = Array.isArray(row.instruments) ? row.instruments : [];
  return {
    id: row.id,
    displayName: row.display_name,
    instruments,
    listName: formatProfileListName(row.display_name, row.id),
  };
}

/** Loads directory, who you follow, and FoF ids for the Friends screen. */
export async function getFriendsSnapshot(): Promise<FriendsSnapshot> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const { data: profileRows, error: pErr } = await client
    .from("profiles")
    .select("id, display_name, instruments")
    .neq("id", user.id);

  if (pErr) {
    throw new Error(pErr.message);
  }

  const directory = (profileRows ?? []).map((r) => mapCard(r as ProfileRow)).sort((a, b) => {
    return a.listName.localeCompare(b.listName, "en");
  });

  const { data: myFollows, error: fErr } = await client
    .from("profile_follows")
    .select("following_id")
    .eq("follower_id", user.id);

  if (fErr) {
    throw new Error(fErr.message);
  }

  const followingIds = (myFollows ?? []).map((r) => (r as { following_id: string }).following_id);
  const followingSet = new Set(followingIds);

  let friendsOfFriendsIds: string[] = [];
  if (followingIds.length > 0) {
    const { data: edgesRows, error: eErr } = await client.rpc("profile_follows_edges_for_followers", {
      p_follower_ids: followingIds,
    });

    if (eErr) {
      throw new Error(eErr.message);
    }

    const edges = (edgesRows ?? []).map((r) => ({
      followerId: (r as { follower_id: string }).follower_id,
      followingId: (r as { following_id: string }).following_id,
    }));

    friendsOfFriendsIds = computeFriendsOfFriendsIds(user.id, followingSet, edges);
  }

  return {
    myUserId: user.id,
    directory,
    followingIds,
    friendsOfFriendsIds,
  };
}
