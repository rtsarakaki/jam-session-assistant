"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createJamSessionAction, duplicateJamSessionAction } from "@/lib/actions/jam-session-actions";
import type { AppLocale } from "@/lib/i18n/locales";
import { buildJamEffectiveKnownByList, jamParticipantKnownRollup, profilePlaysAnySongInJam } from "@/lib/jam/jam-known-by-score";
import type { JamParticipantOption, JamSuggestionSeed } from "@/lib/platform/jam-service";

type JamPanelProps = {
  locale: AppLocale;
  currentUser: JamParticipantOption;
  songs: JamSuggestionSeed[];
  recentSessions: Array<{
    sessionId: string;
    title: string;
    status: string;
    startedAt: string | null;
    participants: JamParticipantOption[];
  }>;
  mySessions: Array<{
    sessionId: string;
    title: string;
    status: string;
    startedAt: string | null;
    participants: JamParticipantOption[];
  }>;
};

type RankedSuggestion = JamSuggestionSeed & {
  knownByCount: number;
  uniqueKnownByCount: number;
  participantCoverage: number;
  participantScore: number;
  score: number;
};

function stableSongOrderKey(songId: string): number {
  let hash = 0;
  for (let i = 0; i < songId.length; i += 1) {
    hash = (hash * 31 + songId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function formatSessionDate(value: string | null, locale: AppLocale): string {
  if (!value) return locale === "pt" ? "Sem data" : "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return locale === "pt" ? "Sem data" : "No date";
  return date.toLocaleDateString();
}

export function JamPanel({ locale, currentUser, songs, recentSessions, mySessions }: JamPanelProps) {
  const pt = locale === "pt";
  const router = useRouter();
  const [sessionsTab, setSessionsTab] = useState<"recent" | "mine">("recent");
  const selectedParticipantIds = useMemo(() => [currentUser.id], [currentUser.id]);
  const [creatingSession, setCreatingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [copyingSessionId, setCopyingSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState("");
  const activeSessions = sessionsTab === "mine" ? mySessions : recentSessions;

  const playsAnySongByParticipantId = useMemo(() => {
    const m = new Map<string, boolean>();
    m.set(currentUser.id, profilePlaysAnySongInJam(currentUser.instruments ?? []));
    return m;
  }, [currentUser.id, currentUser.instruments]);

  const ranked = useMemo(() => {
    const selectedCount = Math.max(1, selectedParticipantIds.length);
    const rows: RankedSuggestion[] = songs.map((song) => {
      const effective = buildJamEffectiveKnownByList(
        song.knownByProfileIds,
        selectedParticipantIds,
        playsAnySongByParticipantId,
      );
      const { knownByCount, uniqueKnownByCount, participantCoverage, participantScore } = jamParticipantKnownRollup(
        effective,
        selectedCount,
      );
      const historyScore = 20 / (1 + song.playCount);
      const score = Number((participantScore + historyScore).toFixed(2));
      return { ...song, knownByCount, uniqueKnownByCount, participantCoverage, participantScore, score };
    });

    return rows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.knownByCount !== a.knownByCount) return b.knownByCount - a.knownByCount;
      if (a.playCount !== b.playCount) return a.playCount - b.playCount;
      return stableSongOrderKey(a.songId) - stableSongOrderKey(b.songId);
    });
  }, [songs, selectedParticipantIds, playsAnySongByParticipantId]);

  async function duplicateSession(sessionId: string, currentTitle: string) {
    if (copyingSessionId) return;
    const suggestedName = `${currentTitle} ${pt ? "(cópia)" : "(copy)"}`;
    const promptLabel = pt ? "Informe o nome da nova jam:" : "Enter new jam name:";
    const nextTitle = window.prompt(promptLabel, suggestedName)?.trim();
    if (!nextTitle) return;

    setCopyingSessionId(sessionId);
    setSessionError(null);
    try {
      const result = await duplicateJamSessionAction({ sourceSessionId: sessionId, title: nextTitle });
      if (result.error || !result.sessionId) {
        setSessionError(result.error ?? (pt ? "Não foi possível copiar a jam." : "Could not duplicate jam."));
        return;
      }
      router.push(`/app/jam/session/${result.sessionId}`);
    } finally {
      setCopyingSessionId(null);
    }
  }

  async function createJamSession() {
    if (creatingSession) return;
    setCreatingSession(true);
    setSessionError(null);
    try {
      const topSongs = ranked.slice(0, 20).map((song) => song.songId);
      const created = await createJamSessionAction({
        title: sessionTitle.trim(),
        participantIds: [],
        songIds: topSongs,
      });
      if (created.error || !created.sessionId) {
        setSessionError(created.error ?? (pt ? "Não foi possível criar a jam." : "Could not create jam session."));
        return;
      }
      router.push(`/app/jam/session/${created.sessionId}`);
    } finally {
      setCreatingSession(false);
    }
  }

  return (
    <main id="app-main" className="mx-auto w-full max-w-5xl pb-8">
      <section className="rounded-2xl border border-[#2a3344] bg-[#171c26] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.22)] sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="m-0 min-w-0 flex-1 truncate text-xl font-semibold text-[#e8ecf4]">{pt ? "Sugestões de jam" : "Jam suggestions"}</h2>
        </div>
        <p className="mt-2 text-xs text-[#8b95a8]">
          {pt
            ? "O score favorece músicas conhecidas por mais participantes e menos tocadas no histórico da jam."
            : "Score favors songs known by more selected participants and songs played less often in your jam history."}
        </p>
        {sessionError ? <p className="mt-2 text-xs text-[#fca5a5]">{sessionError}</p> : null}

        <div className="mt-4 rounded-xl border border-dashed border-[#2a3344] bg-[#0f1520] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8b95a8]">{pt ? "Criar nova jam" : "Create new jam"}</p>
          <div className="mt-3">
            <input
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder={pt ? "Título da jam (opcional)" : "Jam title (optional)"}
              className="min-w-[220px] rounded-md border border-[#2a3344] bg-[#1e2533] px-3 py-2 text-sm text-[#e8ecf4]"
            />
          </div>
          <p className="mt-3 text-xs text-[#8b95a8]">
            {pt
              ? "Os participantes podem ser configurados depois, dentro da jam criada."
              : "Participants can be configured later, inside the created jam session."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={createJamSession}
              disabled={creatingSession}
              className="rounded-md border border-[#6ee7b7] bg-[#1e2533] px-3 py-2 text-xs font-semibold text-[#6ee7b7] hover:text-[#a7f3d0] disabled:opacity-70"
            >
              {creatingSession ? (pt ? "Criando..." : "Creating...") : pt ? "Criar jam" : "Create jam session"}
            </button>
          </div>
        </div>
        <div className="mt-6 rounded-xl border border-[#2a3344] bg-[#111722] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8b95a8]">{pt ? "Jams existentes" : "Existing jams"}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSessionsTab("recent")}
                className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${
                  sessionsTab === "recent" ? "border-[#6ee7b7] text-[#6ee7b7]" : "border-[#2a3344] text-[#8b95a8]"
                }`}
              >
                {pt ? "Recentes" : "Recent jams"}
              </button>
              <button
                type="button"
                onClick={() => setSessionsTab("mine")}
                className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${
                  sessionsTab === "mine" ? "border-[#6ee7b7] text-[#6ee7b7]" : "border-[#2a3344] text-[#8b95a8]"
                }`}
              >
                {pt ? "Minhas jams" : "My jams"}
              </button>
            </div>
          </div>
          {activeSessions.length === 0 ? (
            <p className="mt-2 text-xs text-[#8b95a8]">
              {sessionsTab === "mine"
                ? pt
                  ? "Você ainda não participa de nenhuma jam."
                  : "You are not a participant in any jam yet."
                : pt
                  ? "Ainda não há jams anteriores."
                  : "No previous jam sessions yet."}
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {activeSessions.map((session) => (
                <li key={session.sessionId} className="flex items-center justify-between rounded-md border border-[#2a3344] bg-[#1e2533] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-[#e8ecf4]">{session.title}</p>
                    <p className="text-[10px] uppercase tracking-wide text-[#8b95a8]">
                      {session.status} · {formatSessionDate(session.startedAt, locale)}
                    </p>
                    <p className="text-[10px] text-[#8b95a8]">
                      {session.participants.length} {pt ? (session.participants.length === 1 ? "participante" : "participantes") : session.participants.length === 1 ? "participant" : "participants"}
                    </p>
                  </div>
                  <div className="ml-2 flex shrink-0 items-center gap-2">
                    <Link
                      href={`/app/jam/session/${session.sessionId}`}
                      className="rounded-md border border-[#2a3344] px-2 py-1 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
                    >
                      {pt ? "Abrir" : "Open"}
                    </Link>
                    <button
                      type="button"
                      onClick={() => void duplicateSession(session.sessionId, session.title)}
                      disabled={copyingSessionId === session.sessionId}
                      className="rounded-md border border-[#2a3344] px-2 py-1 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4] disabled:opacity-70"
                    >
                      {copyingSessionId === session.sessionId
                        ? pt
                          ? "Copiando..."
                          : "Copying..."
                        : pt
                          ? "Copiar"
                          : "Copy"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
