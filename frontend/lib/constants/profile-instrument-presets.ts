/** Preset checkboxes aligned with `prototype/index.html` (Profile → Instruments). */
export const PROFILE_INSTRUMENT_PRESETS = [
  "Audience",
  "Acoustic guitar",
  "Electric guitar",
  "Bass",
  "Drums",
  "Keys / piano",
  "Vocals",
  "Saxophone",
  "Trumpet",
  "Violin",
  "Harmonica",
  "Percussion",
] as const;

export type ProfileInstrumentPreset = (typeof PROFILE_INSTRUMENT_PRESETS)[number];
