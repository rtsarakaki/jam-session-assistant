"use server";

import { revalidatePath } from "next/cache";
import { upsertMyProfile } from "@/lib/platform/profile-service";
import { profileFormInitialState, type ProfileFormState } from "@/app/(private)/app/profile/profile-form-state";
import { normalizeProfileInstruments } from "@/lib/validation/profile-instruments";

export async function saveProfileAction(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  try {
    const instruments = normalizeProfileInstruments(formData.getAll("instruments"));

    await upsertMyProfile({
      displayName: String(formData.get("displayName") ?? ""),
      username: String(formData.get("username") ?? ""),
      bio: String(formData.get("bio") ?? ""),
      instruments,
    });
    revalidatePath("/app/profile");
    revalidatePath("/app/friends");
    return { error: null, success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Something went wrong.";
    return { ...profileFormInitialState, error: message, success: false };
  }
}
