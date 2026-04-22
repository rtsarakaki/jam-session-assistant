import "server-only";

import { createSessionBoundDataClient } from "@/lib/platform/database";
import { formatProfileListName } from "@/lib/platform/friends-candidates";
import { isUuidLike } from "@/lib/platform/user-channel-service";
import { findFirstVideoLikeUrlInBody } from "@/lib/validation/feed-video-url";
import type { CoverGalleryScope } from "@/lib/navigation/cover-gallery-href";

export type CoverGalleryPostItem = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorUsername: string | null;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  authorLabel: string;
  songId: string;
  songTitle: string;
  songArtist: string;
  videoUrl: string;
};

type SongMini = { id: string; title: string; artist: string };

type PostRow = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  song_id: string | null;
  songs: { id: string; title: string; artist: string } | { id: string; title: string; artist: string }[] | null;
  profiles:
    | { username: string | null; display_name: string | null; avatar_url: string | null }
    | { username: string | null; display_name: string | null; avatar_url: string | null }[]
    | null;
};

function firstRel<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

const POSTS_SELECT = `
  id,
  body,
  created_at,
  author_id,
  song_id,
  songs ( id, title, artist ),
  profiles!friend_feed_posts_author_id_fkey ( username, display_name, avatar_url )
`;

function mapPostRowToGalleryItem(row: PostRow): CoverGalleryPostItem | null {
  if (!row.song_id) return null;
  const song = firstRel(row.songs);
  if (!song?.id) return null;
  const videoUrl = findFirstVideoLikeUrlInBody(row.body);
  if (!videoUrl) return null;
  const prof = firstRel(row.profiles);
  const authorUsername = prof?.username ?? null;
  const authorDisplayName = prof?.display_name ?? null;
  const authorAvatarUrl = prof?.avatar_url?.trim() || null;
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    authorId: row.author_id,
    authorUsername,
    authorDisplayName,
    authorAvatarUrl,
    authorLabel: formatProfileListName(authorUsername, authorDisplayName, row.author_id),
    songId: song.id,
    songTitle: song.title,
    songArtist: song.artist,
    videoUrl,
  };
}

const COVER_COUNT_PAGE = 500;

/**
 * Counts feed posts that appear in the cover gallery for each song id (video URL in body + catalog song).
 * Uses the same rules as gallery listing; scope is always "all" (not friends-only).
 */
export async function countCoverGalleryPostsBySongIds(songIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const unique = [...new Set(songIds)].filter(Boolean);
  if (unique.length === 0) return out;

  const client = await createSessionBoundDataClient();
  const CHUNK = 60;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const slice = unique.slice(i, i + CHUNK);
    let start = 0;
    for (;;) {
      const end = start + COVER_COUNT_PAGE - 1;
      const { data, error } = await client
        .from("friend_feed_posts")
        .select(POSTS_SELECT)
        .in("song_id", slice)
        .not("song_id", "is", null)
        .order("created_at", { ascending: false })
        .range(start, end);
      if (error) {
        throw new Error(error.message);
      }
      const batch = (data ?? []) as PostRow[];
      if (batch.length === 0) break;
      for (const row of batch) {
        const item = mapPostRowToGalleryItem(row);
        if (!item) continue;
        out.set(item.songId, (out.get(item.songId) ?? 0) + 1);
      }
      if (batch.length < COVER_COUNT_PAGE) break;
      start += COVER_COUNT_PAGE;
    }
  }
  return out;
}

export async function getSongMiniById(songId: string): Promise<SongMini | null> {
  const client = await createSessionBoundDataClient();
  const { data, error } = await client
    .from("songs")
    .select("id, title, artist")
    .eq("id", songId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  const row = data as { id: string; title: string; artist: string } | null;
  return row ?? null;
}

export async function listSongsByArtistExact(artist: string): Promise<Array<{ id: string; title: string }>> {
  const a = artist.trim();
  if (!a) return [];
  const client = await createSessionBoundDataClient();
  const { data, error } = await client
    .from("songs")
    .select("id, title")
    .eq("artist", a)
    .order("title", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return ((data ?? []) as Array<{ id: string; title: string }>).map((r) => ({
    id: r.id,
    title: r.title,
  }));
}

const LIKE_COUNT_CHUNK = 120;

async function fetchPostLikeCounts(
  client: Awaited<ReturnType<typeof createSessionBoundDataClient>>,
  postIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const unique = [...new Set(postIds)].filter(Boolean);
  for (const id of unique) {
    counts.set(id, 0);
  }
  if (unique.length === 0) return counts;

  for (let i = 0; i < unique.length; i += LIKE_COUNT_CHUNK) {
    const slice = unique.slice(i, i + LIKE_COUNT_CHUNK);
    const { data, error } = await client.from("friend_feed_post_likes").select("post_id").in("post_id", slice);
    if (error) {
      throw new Error(error.message);
    }
    for (const row of (data ?? []) as Array<{ post_id: string }>) {
      const id = row.post_id;
      if (!id) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}

async function loadMyFollowingIds(client: Awaited<ReturnType<typeof createSessionBoundDataClient>>): Promise<Set<string>> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return new Set();
  const { data, error } = await client.from("profile_follows").select("following_id").eq("follower_id", user.id);
  if (error) {
    throw new Error(error.message);
  }
  return new Set(
    ((data ?? []) as Array<{ following_id: string }>).map((r) => r.following_id).filter(Boolean),
  );
}

async function fetchFeedPostsForSongIds(
  client: Awaited<ReturnType<typeof createSessionBoundDataClient>>,
  songIds: string[],
  scope: CoverGalleryScope,
): Promise<CoverGalleryPostItem[]> {
  const unique = [...new Set(songIds)].filter(Boolean);
  if (unique.length === 0) return [];

  let following: Set<string> | null = null;
  if (scope === "friends") {
    following = await loadMyFollowingIds(client);
    if (following.size === 0) {
      return [];
    }
  }

  const CHUNK = 60;
  const rows: PostRow[] = [];
  for (let i = 0; i < unique.length; i += CHUNK) {
    const slice = unique.slice(i, i + CHUNK);
    const { data, error } = await client
      .from("friend_feed_posts")
      .select(POSTS_SELECT)
      .in("song_id", slice)
      .not("song_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(400);
    if (error) {
      throw new Error(error.message);
    }
    rows.push(...((data ?? []) as PostRow[]));
  }

  const items: CoverGalleryPostItem[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const item = mapPostRowToGalleryItem(row);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }

  const likeByPost = await fetchPostLikeCounts(client, items.map((p) => p.id));
  items.sort((a, b) => {
    const la = likeByPost.get(a.id) ?? 0;
    const lb = likeByPost.get(b.id) ?? 0;
    if (lb !== la) return lb - la;
    return b.createdAt.localeCompare(a.createdAt);
  });

  if (scope === "friends" && following) {
    return items.filter((p) => following!.has(p.authorId));
  }
  return items;
}

export async function listCoverGalleryPostsForSong(songId: string, scope: CoverGalleryScope): Promise<CoverGalleryPostItem[]> {
  const client = await createSessionBoundDataClient();
  return fetchFeedPostsForSongIds(client, [songId], scope);
}

export async function listCoverGalleryPostsForArtist(artist: string, scope: CoverGalleryScope): Promise<CoverGalleryPostItem[]> {
  const songs = await listSongsByArtistExact(artist);
  const ids = songs.map((s) => s.id);
  const client = await createSessionBoundDataClient();
  return fetchFeedPostsForSongIds(client, ids, scope);
}

export type CoverGalleryPageModel =
  | { kind: "empty" }
  | {
      kind: "song";
      song: SongMini;
      posts: CoverGalleryPostItem[];
      scope: CoverGalleryScope;
    }
  | {
      kind: "artist";
      artist: string;
      posts: CoverGalleryPostItem[];
      songsForFilter: Array<{ id: string; title: string }>;
      filteredSongId: string | null;
      scope: CoverGalleryScope;
    };

function parseCoverGalleryScope(raw: string | null | undefined): CoverGalleryScope {
  return raw?.trim().toLowerCase() === "friends" ? "friends" : "all";
}

/** Viewer id + accounts they follow (for follow CTA on gallery post cards). */
export async function loadCoverGalleryViewerContext(): Promise<{
  viewerId: string;
  followingUserIds: string[];
}> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }
  const { data, error } = await client.from("profile_follows").select("following_id").eq("follower_id", user.id);
  if (error) {
    throw new Error(error.message);
  }
  const followingUserIds = [
    ...new Set(((data ?? []) as Array<{ following_id: string }>).map((r) => r.following_id).filter(Boolean)),
  ];
  return { viewerId: user.id, followingUserIds };
}

export async function loadCoverGalleryPage(input: {
  songId: string | null;
  artist: string | null;
  scope?: string | null;
}): Promise<CoverGalleryPageModel> {
  const songId = input.songId?.trim() && isUuidLike(input.songId.trim()) ? input.songId.trim() : null;
  const artistParam = input.artist?.trim() ? input.artist.trim() : null;
  const scope = parseCoverGalleryScope(input.scope ?? null);

  if (songId) {
    const song = await getSongMiniById(songId);
    if (!song) return { kind: "empty" };

    if (artistParam && song.artist.trim() === artistParam) {
      const songsForFilter = await listSongsByArtistExact(artistParam);
      const posts = await listCoverGalleryPostsForSong(songId, scope);
      return {
        kind: "artist",
        artist: artistParam,
        posts,
        songsForFilter: songsForFilter,
        filteredSongId: songId,
        scope,
      };
    }

    const posts = await listCoverGalleryPostsForSong(songId, scope);
    return { kind: "song", song, posts, scope };
  }

  if (artistParam) {
    const songsForFilter = await listSongsByArtistExact(artistParam);
    const posts = await listCoverGalleryPostsForArtist(artistParam, scope);
    return {
      kind: "artist",
      artist: artistParam,
      posts,
      songsForFilter: songsForFilter,
      filteredSongId: null,
      scope,
    };
  }

  return { kind: "empty" };
}
