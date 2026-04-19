"use client";

import type { ReactNode } from "react";
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
      </div>
    </fieldset>
  );
}
