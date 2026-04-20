"use client";

import type { ReactNode } from "react";
import { PROFILE_JAM_PLAYS_ANY_SONG } from "@/lib/constants/jam-profile-flags";
import { PROFILE_INSTRUMENT_PRESETS } from "@/lib/constants/profile-instrument-presets";
import { validatedHintClass, validatedLabelClass } from "./field-styles";

const checkboxLabelClass =
  "flex cursor-pointer items-center gap-2 rounded-lg border border-[#2a3344] bg-[#1e2533]/80 px-3 py-2 text-sm text-[#e8ecf4] hover:border-[#6ee7b7]/35";

type ProfileInstrumentsFieldProps = {
  disabled?: boolean;
  /** Preset labels that should start checked. */
  defaultSelected: readonly string[];
  hint?: ReactNode;
};

/**
 * Checkbox grid for profile instruments (fixed preset list, `name="instruments"` for FormData).
 */
export function ProfileInstrumentsField({ disabled, defaultSelected, hint }: ProfileInstrumentsFieldProps) {
  const hit = new Set(defaultSelected);

  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className={validatedLabelClass}>Instruments</legend>
      {hint ? <p className={validatedHintClass}>{hint}</p> : null}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PROFILE_INSTRUMENT_PRESETS.map((label) => (
          <label key={label} className={checkboxLabelClass}>
            <input
              type="checkbox"
              name="instruments"
              value={label}
              defaultChecked={hit.has(label)}
              disabled={disabled}
              className="size-4 shrink-0 accent-[#34d399]"
            />
            <span>{label}</span>
          </label>
        ))}
        <label className={`${checkboxLabelClass} border-[color-mix(in_srgb,#6ee7b7_25%,#2a3344)]`}>
          <input
            type="checkbox"
            name="instruments"
            value={PROFILE_JAM_PLAYS_ANY_SONG}
            defaultChecked={hit.has(PROFILE_JAM_PLAYS_ANY_SONG)}
            disabled={disabled}
            className="size-4 shrink-0 accent-[#34d399]"
          />
          <span className="text-[0.8rem] leading-snug">
            I can pick up <strong className="font-semibold text-[#e8ecf4]">any song</strong> in a jam (count me on the
            full list). If you also add songs to your repertoire, those count as an extra emphasis for those titles.
          </span>
        </label>
      </div>
    </fieldset>
  );
}
