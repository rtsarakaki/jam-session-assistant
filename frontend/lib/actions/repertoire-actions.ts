"use server";

import { revalidatePath } from "next/cache";
import {
  addSongToMyRepertoire,
  removeSongFromMyRepertoire,
  type RepertoireLevel,
  updateSongLevelInMyRepertoire,
} from "@/lib/platform/repertoire-service";

export async function addToRepertoireAction(input: {
  songId: string;
  level: RepertoireLevel;
}): Promise<{ error: string | null; repertoireEntryId?: string; musiciansInRepertoire?: number }> {
  if (!input.songId.trim()) return { error: "Pick a song from catalog." };
  try {
    const created = await addSongToMyRepertoire(input);
    revalidatePath("/app/repertoire");
    return { error: null, repertoireEntryId: created.id, musiciansInRepertoire: created.musiciansInRepertoire };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not add to repertoire.";
    if (message.includes("repertoire_songs_unique_profile_song") || message.toLowerCase().includes("duplicate key")) {
      return { error: "This song is already in your repertoire." };
    }
    return { error: message };
  }
}

export async function removeFromRepertoireAction(input: {
  repertoireEntryId: string;
}): Promise<{ error: string | null; songId?: string; musiciansInRepertoire?: number }> {
  if (!input.repertoireEntryId.trim()) return { error: "Invalid repertoire item." };
  try {
    const removed = await removeSongFromMyRepertoire(input);
    revalidatePath("/app/repertoire");
    return {
      error: null,
      songId: removed.songId,
      musiciansInRepertoire: removed.musiciansInRepertoire,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not remove from repertoire.";
    return { error: message };
  }
}

export async function updateRepertoireLevelAction(input: {
  repertoireEntryId: string;
  level: RepertoireLevel;
}): Promise<{ error: string | null }> {
  if (!input.repertoireEntryId.trim()) return { error: "Invalid repertoire item." };
  try {
    await updateSongLevelInMyRepertoire(input);
    revalidatePath("/app/repertoire");
    return { error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not update repertoire level.";
    return { error: message };
  }
}
