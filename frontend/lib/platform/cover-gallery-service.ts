import "server-only";

import { createSessionBoundDataClient } from "@/lib/platform/database";
import { isUuidLike } from "@/lib/platform/user-channel-service";

export type CoverGalleryCardItem = {
  id: string;
  songId: string;
  songTitle: string;
  songArtist: string;
  imageUrl: string;
  note: string | null;
  createdAt: string;
  createdBy: string;
};

type SongMini = { id: string; title: string; artist: string };

type CardRow = {
  id: string;
  song_id: string;
  image_url: string;
  note: string | null;
  created_at: string;
  created_by: string;
  songs: { id: string; title: string; artist: string } | { id: string; title: string; artist: string }[] | null;
};

function firstSong(row: CardRow): SongMini | null {
  const s = row.songs;
  if (!s) return null;
  const one = Array.isArray(s) ? s[0] : s;
  if (!one?.id) return null;
  return { id: one.id, title: one.title, artist: one.artist };
}

function mapCardRow(row: CardRow): CoverGalleryCardItem | null {
  const song = firstSong(row);
  if (!song) return null;
  return {
    id: row.id,
    songId: row.song_id,
    songTitle: song.title,
    songArtist: song.artist,
    imageUrl: row.image_url,
    note: row.note?.trim() || null,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
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

async function fetchCardsForSongIds(client: Awaited<ReturnType<typeof createSessionBoundDataClient>>, songIds: string[]) {
  const unique = [...new Set(songIds)].filter(Boolean);
  if (unique.length === 0) {
    return [] as CoverGalleryCardItem[];
  }
  const { data, error } = await client
    .from("song_cover_cards")
    .select(
      `
      id,
      song_id,
      image_url,
      note,
      created_at,
      created_by,
      songs ( id, title, artist )
    `,
    )
    .in("song_id", unique)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  const rows = (data ?? []) as CardRow[];
  const out: CoverGalleryCardItem[] = [];
  for (const r of rows) {
    const item = mapCardRow(r);
    if (item) out.push(item);
  }
  return out;
}

export async function listCoverGalleryCardsForSong(songId: string): Promise<CoverGalleryCardItem[]> {
  const client = await createSessionBoundDataClient();
  return fetchCardsForSongIds(client, [songId]);
}

export async function listCoverGalleryCardsForArtist(artist: string): Promise<CoverGalleryCardItem[]> {
  const songs = await listSongsByArtistExact(artist);
  const ids = songs.map((s) => s.id);
  const client = await createSessionBoundDataClient();
  return fetchCardsForSongIds(client, ids);
}

export type CoverGalleryPageModel =
  | { kind: "empty" }
  | {
      kind: "song";
      song: SongMini;
      cards: CoverGalleryCardItem[];
    }
  | {
      kind: "artist";
      artist: string;
      cards: CoverGalleryCardItem[];
      songsForFilter: Array<{ id: string; title: string }>;
      /** When set, cards are only for this song (same artist). */
      filteredSongId: string | null;
    };

export async function loadCoverGalleryPage(input: {
  songId: string | null;
  artist: string | null;
}): Promise<CoverGalleryPageModel> {
  const songId = input.songId?.trim() && isUuidLike(input.songId.trim()) ? input.songId.trim() : null;
  const artistParam = input.artist?.trim() ? input.artist.trim() : null;

  if (songId) {
    const song = await getSongMiniById(songId);
    if (!song) return { kind: "empty" };

    if (artistParam && song.artist.trim() === artistParam) {
      const songsForFilter = await listSongsByArtistExact(artistParam);
      const cards = await listCoverGalleryCardsForSong(songId);
      return {
        kind: "artist",
        artist: artistParam,
        cards,
        songsForFilter: songsForFilter,
        filteredSongId: songId,
      };
    }

    const cards = await listCoverGalleryCardsForSong(songId);
    return { kind: "song", song, cards };
  }

  if (artistParam) {
    const songsForFilter = await listSongsByArtistExact(artistParam);
    const cards = await listCoverGalleryCardsForArtist(artistParam);
    return {
      kind: "artist",
      artist: artistParam,
      cards,
      songsForFilter: songsForFilter,
      filteredSongId: null,
    };
  }

  return { kind: "empty" };
}

const IMAGE_URL_RE = /^https?:\/\//i;

export async function addCoverGalleryCard(input: { songId: string; imageUrl: string; note?: string | null }): Promise<void> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }
  const url = input.imageUrl.trim();
  if (!IMAGE_URL_RE.test(url)) {
    throw new Error("Image URL must start with http:// or https://.");
  }
  const song = await getSongMiniById(input.songId);
  if (!song) {
    throw new Error("Song not found.");
  }
  const note = input.note?.trim() ? input.note.trim() : null;
  const { error } = await client.from("song_cover_cards").insert({
    song_id: input.songId,
    image_url: url,
    note,
    created_by: user.id,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteCoverGalleryCard(cardId: string): Promise<void> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }
  const { error } = await client.from("song_cover_cards").delete().eq("id", cardId).eq("created_by", user.id);
  if (error) {
    throw new Error(error.message);
  }
}
