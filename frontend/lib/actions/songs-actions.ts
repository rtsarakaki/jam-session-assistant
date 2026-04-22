"use server";

import { revalidatePath } from "next/cache";
import { createSongCatalogItem, deleteSongCatalogItem, type SongCatalogItem, updateSongCatalogItem } from "@/lib/platform/songs-service";

type CreateSongActionInput = {
  title: string;
  artist: string;
  language: string;
  lyricsUrl?: string;
  listenUrl?: string;
  karaokeUrl?: string;
};

export type CreateSongActionResult = {
  error: string | null;
  song?: SongCatalogItem;
};

type UpdateSongActionInput = {
  songId: string;
  title: string;
  artist: string;
  language: string;
  lyricsUrl?: string;
  listenUrl?: string;
  karaokeUrl?: string;
};

export type UpdateSongActionResult = {
  error: string | null;
  song?: SongCatalogItem;
};

export type DeleteSongActionResult = {
  error: string | null;
};

function sanitizeUrl(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return undefined;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

export async function createSongAction(input: CreateSongActionInput): Promise<CreateSongActionResult> {
  const title = input.title.trim();
  const artist = input.artist.trim();
  if (!title || !artist) {
    return { error: "Title and artist are required." };
  }

  const lyricsUrl = sanitizeUrl(input.lyricsUrl);
  const listenUrl = sanitizeUrl(input.listenUrl);
  const karaokeUrl = sanitizeUrl(input.karaokeUrl);
  if ((input.lyricsUrl?.trim() ?? "") && !lyricsUrl) {
    return { error: "Lyrics URL must start with http:// or https://" };
  }
  if ((input.listenUrl?.trim() ?? "") && !listenUrl) {
    return { error: "Listen URL must start with http:// or https://" };
  }
  if ((input.karaokeUrl?.trim() ?? "") && !karaokeUrl) {
    return { error: "Karaoke URL must start with http:// or https://" };
  }

  try {
    const song = await createSongCatalogItem({
      title,
      artist,
      language: input.language || "en",
      lyricsUrl,
      listenUrl,
      karaokeUrl,
    });
    revalidatePath("/app/songs");
    return { error: null, song };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not add song." };
  }
}

export async function updateSongAction(input: UpdateSongActionInput): Promise<UpdateSongActionResult> {
  const title = input.title.trim();
  const artist = input.artist.trim();
  if (!input.songId.trim()) {
    return { error: "Invalid song." };
  }
  if (!title || !artist) {
    return { error: "Title and artist are required." };
  }

  const lyricsUrl = sanitizeUrl(input.lyricsUrl);
  const listenUrl = sanitizeUrl(input.listenUrl);
  const karaokeUrl = sanitizeUrl(input.karaokeUrl);
  if ((input.lyricsUrl?.trim() ?? "") && !lyricsUrl) {
    return { error: "Lyrics URL must start with http:// or https://" };
  }
  if ((input.listenUrl?.trim() ?? "") && !listenUrl) {
    return { error: "Listen URL must start with http:// or https://" };
  }
  if ((input.karaokeUrl?.trim() ?? "") && !karaokeUrl) {
    return { error: "Karaoke URL must start with http:// or https://" };
  }

  try {
    const result = await updateSongCatalogItem({
      songId: input.songId,
      title,
      artist,
      language: input.language || "en",
      lyricsUrl,
      listenUrl,
      karaokeUrl,
    });
    revalidatePath("/app/songs");
    return { error: null, song: result.song };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not update song." };
  }
}

export async function deleteSongAction(input: { songId: string }): Promise<DeleteSongActionResult> {
  if (!input.songId.trim()) return { error: "Invalid song." };
  try {
    await deleteSongCatalogItem(input.songId);
    revalidatePath("/app/songs");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not delete song." };
  }
}
