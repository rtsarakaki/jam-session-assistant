import { PROFILE_JAM_PLAYS_ANY_SONG } from "@/lib/constants/jam-profile-flags";

export function profilePlaysAnySongInJam(instruments: string[] | null | undefined): boolean {
  return Array.isArray(instruments) && instruments.includes(PROFILE_JAM_PLAYS_ANY_SONG);
}

/**
 * Per-song list used for jam “who knows this” scoring among selected participants.
 * - Repertoire: one entry if they have the song in repertoire.
 * - “Plays any song”: one entry on every song for that participant.
 * - If both: a second entry when they also have repertoire (emphasis / audience-style bump).
 */
export function buildJamEffectiveKnownByList(
  repertoireProfileIdsForSong: readonly string[],
  selectedParticipantIds: readonly string[],
  playsAnySongByParticipantId: ReadonlyMap<string, boolean>,
): string[] {
  const repSet = new Set(repertoireProfileIdsForSong);
  const out: string[] = [];
  for (const pid of selectedParticipantIds) {
    const playsAny = playsAnySongByParticipantId.get(pid) ?? false;
    if (playsAny) {
      out.push(pid);
      if (repSet.has(pid)) out.push(pid);
    } else if (repSet.has(pid)) {
      out.push(pid);
    }
  }
  return out;
}

/** Coverage % uses unique participants; score adds a small bump for repertoire emphasis (duplicate id in effective list). */
export function jamParticipantKnownRollup(effectiveKnownBy: readonly string[], participantCount: number) {
  const n = Math.max(1, participantCount);
  const unique = new Set(effectiveKnownBy).size;
  const emphasis = Math.max(0, effectiveKnownBy.length - unique);
  const participantCoverage = Math.min(1, unique / n);
  const baseScore = (unique / n) * 80;
  const participantScore = Math.min(80, baseScore + Math.min(8, emphasis * 4));
  return {
    knownByCount: effectiveKnownBy.length,
    uniqueKnownByCount: unique,
    participantCoverage,
    participantScore,
  };
}
