"use client";

import { useActionState, useMemo } from "react";
import { saveProfileAction } from "@/app/(private)/app/profile/profile-actions";
import { profileFormInitialState, type ProfileFormState } from "@/app/(private)/app/profile/profile-form-state";
import { HighlightButton } from "@/components/buttons/HighlightButton";
import { FormErrorBanner } from "@/components/feedback";
import { validatedInputClass, validatedLabelClass } from "@/components/inputs/field-styles";
import { PROFILE_INSTRUMENT_PRESETS } from "@/lib/constants/profile-instrument-presets";
import type { UserProfile } from "@/lib/platform/profile-service";
import { splitInstrumentsForForm } from "@/lib/validation/profile-instruments";

type ProfileFormProps = {
  initial: UserProfile | null;
};

export function ProfileForm({ initial }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    saveProfileAction,
    profileFormInitialState,
  );

  const { presetSelected, otherLine } = useMemo(
    () => splitInstrumentsForForm(initial?.instruments),
    [initial?.instruments],
  );

  const presetHit = useMemo(() => new Set(presetSelected), [presetSelected]);

  return (
    <main id="app-main" className="mx-auto max-w-2xl py-6">
      <h1 className="m-0 text-2xl font-bold tracking-tight text-[#6ee7b7]">Profile</h1>
      <p className="mt-2 text-sm leading-relaxed text-[#8b95a8]">
        Update how you appear in jams. This is stored in your account profile.
      </p>

      <form action={formAction} className="mt-8 space-y-6">
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
            placeholder="Tell others about your style (optional)."
          />
          <p className="mt-1 text-xs text-[#8b95a8]">Up to 500 characters.</p>
        </div>

        <fieldset className="min-w-0 border-0 p-0">
          <legend className={validatedLabelClass}>Instruments</legend>
          <p className="mt-1 text-xs leading-relaxed text-[#8b95a8]">
            Check everything you play. Under <strong className="text-[#e8ecf4]">Other</strong> you can add more (several:
            comma-separated).
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PROFILE_INSTRUMENT_PRESETS.map((label) => (
              <label
                key={label}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#2a3344] bg-[#1e2533]/80 px-3 py-2 text-sm text-[#e8ecf4] hover:border-[#6ee7b7]/35"
              >
                <input
                  type="checkbox"
                  name="instruments"
                  value={label}
                  defaultChecked={presetHit.has(label)}
                  disabled={pending}
                  className="size-4 shrink-0 accent-[#34d399]"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <div className="mt-4">
            <label htmlFor="instrumentsOther" className={validatedLabelClass}>
              Other
            </label>
            <input
              id="instrumentsOther"
              name="instrumentsOther"
              type="text"
              autoComplete="off"
              defaultValue={otherLine}
              disabled={pending}
              className={validatedInputClass}
              placeholder="e.g. mandolin, chromatic accordion…"
            />
          </div>
        </fieldset>

        <HighlightButton type="submit" disabled={pending} className="mt-2 w-full min-w-0 flex-none">
          {pending ? "Saving…" : "Save profile"}
        </HighlightButton>
      </form>
    </main>
  );
}
