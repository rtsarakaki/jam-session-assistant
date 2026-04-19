import { PROFILE_INSTRUMENT_PRESETS } from "@/lib/constants/profile-instrument-presets";

const PRESET_SET = new Set<string>(PROFILE_INSTRUMENT_PRESETS);

export const PROFILE_INSTRUMENTS_MAX = 24;
export const PROFILE_INSTRUMENT_LABEL_MAX = 50;

export type InstrumentsFormSplit = {
  /** Preset values that appear checked. */
  presetSelected: readonly string[];
  /** Comma-joined custom instruments for the "Other" field. */
  otherLine: string;
};

/** Splits stored list into preset vs extras (for filling the form). */
export function splitInstrumentsForForm(stored: string[] | null | undefined): InstrumentsFormSplit {
  const list = Array.isArray(stored) ? stored : [];
  const presetSelected = list.filter((x) => PRESET_SET.has(x));
  const extras = list.filter((x) => !PRESET_SET.has(x));
  return { presetSelected, otherLine: extras.join(", ") };
}

const CUSTOM_LABEL_RE = /^[\p{L}\p{N}\s\-/&.'’]+$/u;

function pushUnique(out: string[], seen: Set<string>, value: string) {
  const key = value.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  out.push(value);
}

/**
 * Builds the canonical instrument list from form POST data.
 * Preset checkboxes must match known presets (ignores tampered values).
 * "Other" is comma-separated like the prototype.
 */
export function normalizeProfileInstruments(
  selectedFromForm: unknown[],
  otherRaw: string,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const v of selectedFromForm) {
    if (typeof v !== "string") continue;
    const t = v.trim();
    if (!t || !PRESET_SET.has(t)) continue;
    if (t.length > PROFILE_INSTRUMENT_LABEL_MAX) {
      throw new Error(`Instrument label is too long: ${t.slice(0, 20)}…`);
    }
    pushUnique(out, seen, t);
  }

  const extra = otherRaw.trim();
  if (extra) {
    for (const part of extra.split(",")) {
      const x = part.trim();
      if (!x) continue;
      if (x.length > PROFILE_INSTRUMENT_LABEL_MAX) {
        throw new Error("Each custom instrument must be at most 50 characters.");
      }
      if (!CUSTOM_LABEL_RE.test(x)) {
        throw new Error("Custom instruments may only include letters, numbers, spaces, and simple punctuation (- / & . ’).");
      }
      pushUnique(out, seen, x);
    }
  }

  if (out.length > PROFILE_INSTRUMENTS_MAX) {
    throw new Error(`You can select at most ${PROFILE_INSTRUMENTS_MAX} instruments.`);
  }

  return out;
}
