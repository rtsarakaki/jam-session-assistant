import { PROFILE_JAM_PLAYS_ANY_SONG } from "@/lib/constants/jam-profile-flags";
import { PROFILE_INSTRUMENT_PRESETS } from "@/lib/constants/profile-instrument-presets";

const PRESET_SET = new Set<string>(PROFILE_INSTRUMENT_PRESETS);

export const PROFILE_INSTRUMENTS_MAX = 24;
export const PROFILE_INSTRUMENT_LABEL_MAX = 50;

/** Preset values present in stored profile (extras are ignored for the form). Includes jam “any song” flag. */
export function presetInstrumentsFromStored(stored: string[] | null | undefined): readonly string[] {
  const list = Array.isArray(stored) ? stored : [];
  const presets = list.filter((x) => PRESET_SET.has(x));
  const anySong = list.includes(PROFILE_JAM_PLAYS_ANY_SONG) ? [PROFILE_JAM_PLAYS_ANY_SONG] : [];
  return [...presets, ...anySong];
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
    if (!t) continue;
    if (t === PROFILE_JAM_PLAYS_ANY_SONG) {
      pushUnique(out, seen, PROFILE_JAM_PLAYS_ANY_SONG);
      continue;
    }
    if (!PRESET_SET.has(t)) continue;
    if (t.length > PROFILE_INSTRUMENT_LABEL_MAX) {
      throw new Error(`Instrument label is too long: ${t.slice(0, 20)}…`);
    }
    pushUnique(out, seen, t);
  }

  const presetCount = out.filter((x) => x !== PROFILE_JAM_PLAYS_ANY_SONG).length;
  if (presetCount > PROFILE_INSTRUMENTS_MAX) {
    throw new Error(`You can select at most ${PROFILE_INSTRUMENTS_MAX} instruments.`);
  }

  return out;
}
