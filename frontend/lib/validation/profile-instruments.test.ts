import { describe, expect, it } from "vitest";
import { PROFILE_INSTRUMENT_PRESETS } from "@/lib/constants/profile-instrument-presets";
import { normalizeProfileInstruments, presetInstrumentsFromStored } from "./profile-instruments";

describe("presetInstrumentsFromStored", () => {
  it("keeps only known presets", () => {
    expect(presetInstrumentsFromStored(["Bass", "Drums", "mandolin"])).toEqual(["Bass", "Drums"]);
  });

  it("handles empty", () => {
    expect(presetInstrumentsFromStored(undefined)).toEqual([]);
  });
});

describe("normalizeProfileInstruments", () => {
  it("collects valid presets only", () => {
    expect(normalizeProfileInstruments(["Bass", "Vocals"])).toEqual(["Bass", "Vocals"]);
  });

  it("ignores unknown checkbox values", () => {
    expect(normalizeProfileInstruments(["Bass", "<script>"])).toEqual(["Bass"]);
  });

  it("deduplicates repeated preset values", () => {
    expect(normalizeProfileInstruments(["Bass", "Bass", "Drums", "Bass"])).toEqual(["Bass", "Drums"]);
  });

  it("accepts all presets within limit", () => {
    const all = [...PROFILE_INSTRUMENT_PRESETS];
    expect(normalizeProfileInstruments(all).length).toBe(all.length);
  });
});
