import { describe, expect, it } from "vitest";
import { PROFILE_INSTRUMENT_PRESETS } from "@/lib/constants/profile-instrument-presets";
import { normalizeProfileInstruments, splitInstrumentsForForm } from "./profile-instruments";

describe("splitInstrumentsForForm", () => {
  it("splits presets vs extras", () => {
    const r = splitInstrumentsForForm(["Bass", "Drums", "mandolin"]);
    expect(r.presetSelected).toEqual(["Bass", "Drums"]);
    expect(r.otherLine).toBe("mandolin");
  });

  it("handles empty", () => {
    expect(splitInstrumentsForForm(undefined)).toEqual({ presetSelected: [], otherLine: "" });
  });
});

describe("normalizeProfileInstruments", () => {
  it("merges presets and other comma list", () => {
    const out = normalizeProfileInstruments(["Bass", "Vocals"], " cello , cello ");
    expect(out).toEqual(["Bass", "Vocals", "cello"]);
  });

  it("ignores unknown checkbox values", () => {
    expect(normalizeProfileInstruments(["Bass", "<script>"], "")).toEqual(["Bass"]);
  });

  it("rejects too many", () => {
    const many = Array.from({ length: 25 }, (_, i) => `x${i}`);
    expect(() => normalizeProfileInstruments([], many.join(","))).toThrow(/at most/);
  });

  it("rejects invalid custom characters", () => {
    expect(() => normalizeProfileInstruments([], "foo<script>")).toThrow();
  });

  it("accepts all presets within limit", () => {
    const all = [...PROFILE_INSTRUMENT_PRESETS];
    expect(normalizeProfileInstruments(all, "").length).toBe(all.length);
  });
});
