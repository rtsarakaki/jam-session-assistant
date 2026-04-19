import { PROFILE_INSTRUMENT_PRESETS } from "@/lib/constants/profile-instrument-presets";

const PRESET_SET = new Set<string>(PROFILE_INSTRUMENT_PRESETS);

export const PROFILE_INSTRUMENTS_MAX = 24;
export const PROFILE_INSTRUMENT_LABEL_MAX = 50;

/** Preset values present in stored profile (extras are ignored for the form). */
export function presetInstrumentsFromStored(stored: string[] | null | undefined): readonly string[] {
  const list = Array.isArray(stored) ? stored : [];
  return list.filter((x) => PRESET_SET.has(x));
}

function pushUnique(out: string[], seen: Set<string>, value: string) {
  const key = value.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  out.push(value);
}

/**
 * Builds the canonical instrument list from preset checkboxes only.
 * Unknown values (tampered POST) are ignored.
 */
export function normalizeProfileInstruments(selectedFromForm: unknown[]): string[] {
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

  if (out.length > PROFILE_INSTRUMENTS_MAX) {
    throw new Error(`You can select at most ${PROFILE_INSTRUMENTS_MAX} instruments.`);
  }

  return out;
}
