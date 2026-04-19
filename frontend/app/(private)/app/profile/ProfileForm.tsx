"use client";

import { useActionState } from "react";
import { saveProfileAction } from "@/app/(private)/app/profile/profile-actions";
import { profileFormInitialState, type ProfileFormState } from "@/app/(private)/app/profile/profile-form-state";
import { HighlightButton } from "@/components/buttons/HighlightButton";
import { FormErrorBanner } from "@/components/feedback";
import { validatedInputClass, validatedLabelClass } from "@/components/inputs/field-styles";
import type { UserProfile } from "@/lib/platform/profile-service";

type ProfileFormProps = {
  initial: UserProfile | null;
};

export function ProfileForm({ initial }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    saveProfileAction,
    profileFormInitialState,
  );

  return (
    <main id="app-main" className="mx-auto max-w-lg py-6">
      <h1 className="m-0 text-2xl font-bold tracking-tight text-[#6ee7b7]">Profile</h1>
      <p className="mt-2 text-sm leading-relaxed text-[#8b95a8]">
        Update how you appear in jams. This is stored in your account profile.
      </p>

      <form action={formAction} className="mt-8 space-y-5">
        <FormErrorBanner message={state.error} />

        {state.success ? (
          <p className="rounded-lg border border-[#6ee7b7]/35 bg-[color-mix(in_srgb,#6ee7b7_10%,transparent)] px-3 py-2 text-sm text-[#6ee7b7]">
            Profile saved.
          </p>
        ) : null}

        <div>
          <label htmlFor="displayName" className={validatedLabelClass}>
            Display name
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            autoComplete="name"
            maxLength={120}
            defaultValue={initial?.displayName ?? ""}
            disabled={pending}
            className={validatedInputClass}
            placeholder="How you want to appear (optional)"
          />
          <p className="mt-1 text-xs text-[#8b95a8]">
            If set, must include at least one letter (same rules as your account name).
          </p>
        </div>

        <div>
          <label htmlFor="bio" className={validatedLabelClass}>
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            maxLength={500}
            defaultValue={initial?.bio ?? ""}
            disabled={pending}
            className={validatedInputClass}
            placeholder="Optional — instruments you play, styles, links…"
          />
          <p className="mt-1 text-xs text-[#8b95a8]">Up to 500 characters.</p>
        </div>

        <div>
          <label htmlFor="primaryInstrument" className={validatedLabelClass}>
            Primary instrument
          </label>
          <input
            id="primaryInstrument"
            name="primaryInstrument"
            type="text"
            maxLength={80}
            defaultValue={initial?.primaryInstrument ?? ""}
            disabled={pending}
            className={validatedInputClass}
            placeholder="e.g. guitar, keys, drums"
          />
        </div>

        <HighlightButton type="submit" disabled={pending} className="mt-2 w-full min-w-0 flex-none">
          {pending ? "Saving…" : "Save profile"}
        </HighlightButton>
      </form>
    </main>
  );
}
