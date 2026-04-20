"use client";

import { useActionState, useMemo, useRef } from "react";
import { saveProfileAction } from "@/lib/actions/profile-actions";
import { profileFormInitialState, type ProfileFormState } from "@/lib/form-state/profile-form-state";
import { HighlightButton } from "@/components/buttons/HighlightButton";
import { ShowWhen } from "@/components/conditional";
import { FormErrorBanner, FormSuccessBanner } from "@/components/feedback";
import { NameField, type NameFieldHandle } from "@/components/inputs/name-field";
import { UsernameField, type UsernameFieldHandle } from "@/components/inputs/username-field";
import { ProfileInstrumentsField } from "@/components/inputs/profile-instruments-field";
import { TextareaField, type TextareaFieldHandle } from "@/components/inputs/textarea-field";
import type { UserProfile } from "@/lib/platform/profile-service";
import { validateProfileBio, PROFILE_BIO_MAX } from "@/lib/validation/profile-fields";
import { presetInstrumentsFromStored } from "@/lib/validation/profile-instruments";
import { ProfileTourControls } from "./ProfileTourControls";

type ProfileFormProps = {
  initial: UserProfile | null;
};

export function ProfileForm({ initial }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    saveProfileAction,
    profileFormInitialState,
  );

  const nameRef = useRef<NameFieldHandle>(null);
  const usernameRef = useRef<UsernameFieldHandle>(null);
  const bioRef = useRef<TextareaFieldHandle>(null);

  const presetSelected = useMemo(() => presetInstrumentsFromStored(initial?.instruments), [initial?.instruments]);

  return (
    <main id="app-main" className="mx-auto max-w-2xl py-6">
      <h1 className="m-0 text-2xl font-bold tracking-tight text-[#6ee7b7]">Profile</h1>
      <p className="mt-2 text-sm leading-relaxed text-[#8b95a8]">
        Update how you appear in jams. This is stored in your account profile.
      </p>

      <form
        action={formAction}
        className="mt-8 space-y-6"
        onSubmit={(e) => {
          const results = [nameRef.current?.validate(), usernameRef.current?.validate(), bioRef.current?.validate()];
          if (results.some(Boolean)) {
            e.preventDefault();
          }
        }}
      >
        <FormErrorBanner message={state.error} />

        <ShowWhen when={state.success}>
          <FormSuccessBanner message="Profile saved." />
        </ShowWhen>

        <NameField
          ref={nameRef}
          disabled={pending}
          inputName="displayName"
          defaultValue={initial?.displayName ?? ""}
          optional
          placeholder="How you want to appear (optional)"
          hint="If set, must include at least one letter (same rules as your account name)."
        />

        <UsernameField
          ref={usernameRef}
          disabled={pending}
          defaultValue={initial?.username ?? ""}
          optional
          placeholder="your_handle"
          hint="Unique handle for Friends and jam (lowercase letters, numbers, underscores; 3–30 characters). Leave empty to clear."
        />

        <TextareaField
          ref={bioRef}
          disabled={pending}
          name="bio"
          label="Bio"
          rows={4}
          maxLength={PROFILE_BIO_MAX}
          defaultValue={initial?.bio ?? ""}
          placeholder="Tell others about your style (optional)."
          hint={`Up to ${PROFILE_BIO_MAX} characters.`}
          validate={validateProfileBio}
        />

        <ProfileInstrumentsField
          disabled={pending}
          defaultSelected={presetSelected}
          hint="Check everything you play (preset list)."
        />

        <HighlightButton type="submit" disabled={pending} className="mt-2 w-full min-w-0 flex-none">
          {pending ? "Saving…" : "Save profile"}
        </HighlightButton>
      </form>
      <ProfileTourControls userId={initial?.id ?? null} />
    </main>
  );
}
