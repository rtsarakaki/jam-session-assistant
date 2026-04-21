import "server-only";

import { createSessionBoundDataClient } from "@/lib/platform/database";
import { computeFriendsOfFriendsIds, formatProfileListName } from "@/lib/platform/friends-candidates";

export type PublicProfileCard = {
  id: string;
  username: string | null;
  displayName: string | null;
  /** HTTPS image from OAuth metadata (stored on profile); null → show initials. */
  avatarUrl: string | null;
  bio: string | null;
  instruments: string[];
  listName: string;
};

export type FriendsSnapshot = {
  myUserId: string;
  /** Other users (excludes current user), sorted by list name. */
  directory: PublicProfileCard[];
  followingIds: string[];
  /** Users who follow the current user (incoming edges). */
  followerIds: string[];
  friendsOfFriendsIds: string[];
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  instruments: string[] | null;
};

const DEFAULT_PROFILE_INSTRUMENT = "Audience";

function mapCard(row: ProfileRow): PublicProfileCard {
  const instruments =
    Array.isArray(row.instruments) && row.instruments.length > 0 ? row.instruments : [DEFAULT_PROFILE_INSTRUMENT];
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url?.trim() || null,
    bio: row.bio?.trim() || null,
    instruments,
    listName: formatProfileListName(row.username, row.display_name, row.id),
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
    .select("id, username, display_name, avatar_url, bio, instruments")
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

  const { data: incomingFollows, error: inErr } = await client
    .from("profile_follows")
    .select("follower_id")
    .eq("following_id", user.id);

  if (inErr) {
    throw new Error(inErr.message);
  }

  const followerIds = (incomingFollows ?? []).map((r) => (r as { follower_id: string }).follower_id);

  let friendsOfFriendsIds: string[] = [];
  if (followingIds.length > 0) {
    const { data: edgesRows, error: eErr } = await client.rpc("profile_follows_edges_for_followers", {
      p_follower_ids: followingIds,
    });

    if (eErr) {
      throw new Error(eErr.message);
    }

    type RpcEdge = { follower_id: string; following_id: string };
    const edges = ((edgesRows ?? []) as RpcEdge[]).map((r) => ({
      followerId: r.follower_id,
      followingId: r.following_id,
    }));

    friendsOfFriendsIds = computeFriendsOfFriendsIds(user.id, followingSet, edges);
  }

  return {
    myUserId: user.id,
    directory,
    followingIds,
    followerIds,
    friendsOfFriendsIds,
  };
}
