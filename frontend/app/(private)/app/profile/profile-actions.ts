"use server";

import { revalidatePath } from "next/cache";
import { upsertMyProfile } from "@/lib/platform/profile-service";
import { profileFormInitialState, type ProfileFormState } from "@/app/(private)/app/profile/profile-form-state";

export async function saveProfileAction(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  try {
    await upsertMyProfile({
      displayName: String(formData.get("displayName") ?? ""),
      bio: String(formData.get("bio") ?? ""),
      primaryInstrument: String(formData.get("primaryInstrument") ?? ""),
    });
    revalidatePath("/app/profile");
    return { error: null, success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Something went wrong.";
    return { ...profileFormInitialState, error: message, success: false };
  }
}
