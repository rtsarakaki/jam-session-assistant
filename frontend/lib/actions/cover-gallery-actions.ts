"use server";

import { revalidatePath } from "next/cache";
import { addCoverGalleryCard, deleteCoverGalleryCard } from "@/lib/platform/cover-gallery-service";
import { isUuidLike } from "@/lib/platform/user-channel-service";

export async function addCoverGalleryCardAction(input: {
  songId: string;
  imageUrl: string;
  note?: string | null;
}): Promise<{ error: string | null }> {
  if (!isUuidLike(input.songId.trim())) {
    return { error: "Invalid song." };
  }
  try {
    await addCoverGalleryCard({
      songId: input.songId.trim(),
      imageUrl: input.imageUrl,
      note: input.note,
    });
    revalidatePath("/app/covers");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not add cover." };
  }
}

export async function deleteCoverGalleryCardAction(cardId: string): Promise<{ error: string | null }> {
  if (!isUuidLike(cardId.trim())) {
    return { error: "Invalid card." };
  }
  try {
    await deleteCoverGalleryCard(cardId.trim());
    revalidatePath("/app/covers");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not remove cover." };
  }
}
