"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createJamSessionAction } from "@/lib/actions/jam-session-actions";
import { searchJamParticipantsAction, type JamParticipantSearchResult, type JamParticipantSearchScope } from "@/lib/actions/jam-actions";
import { buildJamInviteSharePayload, ShareViaAppsDialog, type ShareViaAppsPayload } from "@/components/sharing/share-via-apps-dialog";
import { buildJamEffectiveKnownByList, jamParticipantKnownRollup, profilePlaysAnySongInJam } from "@/lib/jam/jam-known-by-score";
import type { JamParticipantOption, JamSuggestionSeed } from "@/lib/platform/jam-service";

type JamPanelProps = {
  currentUser: JamParticipantOption;
  defaultSelectedParticipantIds: string[];
  songs: JamSuggestionSeed[];
  recentSessions: Array<{
    sessionId: string;
    title: string;
    status: string;
    startedAt: string | null;
  }>;
};

type RankedSuggestion = JamSuggestionSeed & {
  knownByCount: number;
  uniqueKnownByCount: number;
  participantCoverage: number;
  participantScore: number;
  score: number;
};

function formatSessionDate(value: string | null): string {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString();
}

export function JamPanel({ currentUser, defaultSelectedParticipantIds, songs, recentSessions }: JamPanelProps) {
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>(defaultSelectedParticipantIds);
  const [selectedParticipantsById, setSelectedParticipantsById] = useState<Record<string, JamParticipantOption>>({
    [currentUser.id]: currentUser,
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [scope, setScope] = useState<JamParticipantSearchScope>("friends");
  const [query, setQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<JamParticipantSearchResult[]>([]);
  const [creatingSession, setCreatingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [jamSharePayload, setJamSharePayload] = useState<ShareViaAppsPayload | null>(null);
  const jamShareDialogRef = useRef<HTMLDialogElement>(null);
  const [createdSessionId, setCreatedSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState("");
  const [songDetails, setSongDetails] = useState<RankedSuggestion | null>(null);

  const selectedSet = useMemo(() => new Set(selectedParticipantIds), [selectedParticipantIds]);

  const playsAnySongByParticipantId = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const id of selectedParticipantIds) {
      const opt = selectedParticipantsById[id];
      const instruments = opt?.instruments ?? [];
      m.set(id, profilePlaysAnySongInJam(instruments));
    }
    return m;
  }, [selectedParticipantIds, selectedParticipantsById]);

  const sessionInviteUrl = useMemo(() => {
    if (!createdSessionId || typeof window === "undefined") return "";
    return `${window.location.origin}/app/jam/session/${createdSessionId}`;
  }, [createdSessionId]);

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
      return a.title.localeCompare(b.title);
    });
  }, [songs, selectedParticipantIds, playsAnySongByParticipantId]);

  function toggleParticipant(participantId: string) {
    setSelectedParticipantIds((prev) => (prev.includes(participantId) ? prev.filter((id) => id !== participantId) : [...prev, participantId]));
  }

  function removeParticipant(participantId: string) {
    if (participantId === currentUser.id) return;
    setSelectedParticipantIds((prev) => prev.filter((id) => id !== participantId));
  }

  async function createJamSession() {
    if (creatingSession) return;
    if (selectedParticipantIds.length < 2) {
      setSessionError("Select at least 2 participants to create a jam session.");
      return;
    }
    setCreatingSession(true);
    setSessionError(null);
    try {
      const topSongs = ranked.slice(0, 20).map((song) => song.songId);
      const participantIds = selectedParticipantIds.filter((id) => id !== currentUser.id);
      const created = await createJamSessionAction({
        title: sessionTitle.trim(),
        participantIds,
        songIds: topSongs,
      });
      if (created.error || !created.sessionId) {
        setSessionError(created.error ?? "Could not create jam session.");
        return;
      }
      setCreatedSessionId(created.sessionId);
      const url = `${window.location.origin}/app/jam/session/${created.sessionId}`;
      setJamSharePayload(buildJamInviteSharePayload(url, sessionTitle.trim()));
    } finally {
      setCreatingSession(false);
    }
  }

  useEffect(() => {
    if (!pickerOpen) return;
    let cancelled = false;
    const timeout = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(null);
      const result = await searchJamParticipantsAction({ query, scope, limit: 80 });
      if (cancelled) return;
      if (result.error) {
        setSearchError(result.error);
        setSearchResults([]);
      } else {
        setSearchResults(result.results);
        setSelectedParticipantsById((prev) => {
          const next = { ...prev };
          for (const row of result.results) {
            next[row.id] = { id: row.id, label: row.label, instruments: row.instruments };
          }
          return next;
        });
      }
      setSearchLoading(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [pickerOpen, query, scope]);

  useEffect(() => {
    if (!jamSharePayload) return;
    const el = jamShareDialogRef.current;
    if (el && !el.open) el.showModal();
  }, [jamSharePayload]);

  function openJamSendDialog() {
    if (!sessionInviteUrl) return;
    setJamSharePayload(buildJamInviteSharePayload(sessionInviteUrl, sessionTitle.trim()));
  }

  return (
    <main id="app-main" className="mx-auto w-full max-w-5xl pb-8">
      <section className="rounded-2xl border border-[#2a3344] bg-[#171c26] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.22)] sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="m-0 min-w-0 flex-1 truncate text-xl font-semibold text-[#e8ecf4]">
            {createdSessionId ? sessionTitle.trim() || "Jam session" : "Jam suggestions"}
          </h2>
          {createdSessionId ? (
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/app/jam/session/${createdSessionId}`}
                className="rounded-md border border-[#2a3344] bg-[#1e2533] px-2 py-1 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
              >
                Open session
              </Link>
              <button
                type="button"
                onClick={openJamSendDialog}
                disabled={!sessionInviteUrl}
                aria-label="Send jam link (WhatsApp, Telegram, email…)"
                title="Send via WhatsApp, Telegram, email…"
                className="rounded-md border border-[#2a3344] bg-[#1e2533] px-2 py-1 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4] disabled:opacity-50"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-[#8b95a8]">
          Score favors songs known by more selected participants and songs played less often in your jam history.
        </p>
        {sessionError ? <p className="mt-2 text-xs text-[#fca5a5]">{sessionError}</p> : null}

        <div className="mt-4 rounded-xl border border-[#2a3344] bg-[#111722] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8b95a8]">Recent jams</p>
          </div>
          {recentSessions.length === 0 ? (
            <p className="mt-2 text-xs text-[#8b95a8]">No previous jam sessions yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {recentSessions.map((session) => (
                <li key={session.sessionId} className="flex items-center justify-between rounded-md border border-[#2a3344] bg-[#1e2533] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-[#e8ecf4]">{session.title}</p>
                    <p className="text-[10px] uppercase tracking-wide text-[#8b95a8]">
                      {session.status} · {formatSessionDate(session.startedAt)}
                    </p>
                  </div>
                  <Link
                    href={`/app/jam/session/${session.sessionId}`}
                    className="rounded-md border border-[#2a3344] px-2 py-1 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        {!createdSessionId ? (
          <div className="mt-3">
            <input
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder="Jam title (optional)"
              className="min-w-[220px] rounded-md border border-[#2a3344] bg-[#1e2533] px-3 py-2 text-sm text-[#e8ecf4]"
            />
          </div>
        ) : null}

        <div className="mt-4 rounded-xl border border-[#2a3344] bg-[#111722] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8b95a8]">Participants ({selectedParticipantIds.length})</p>
            <button
              type="button"
              className="rounded-md border border-[#2a3344] px-2 py-1 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
              onClick={() => setPickerOpen(true)}
            >
              Select participants
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedParticipantIds.map((id) => (
              <span key={id} className="inline-flex items-center gap-2 rounded-md border border-[#2a3344] bg-[#1e2533] px-2 py-1 text-xs text-[#e8ecf4]">
                <span>{selectedParticipantsById[id]?.label ?? id.slice(0, 8)}</span>
                {id !== currentUser.id ? (
                  <button
                    type="button"
                    onClick={() => removeParticipant(id)}
                    className="rounded border border-[#2a3344] px-1 text-[10px] text-[#8b95a8] hover:text-[#e8ecf4]"
                    title="Remove participant"
                    aria-label="Remove participant"
                  >
                    x
                  </button>
                ) : null}
              </span>
            ))}
          </div>
        </div>
        {!createdSessionId ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={createJamSession}
              disabled={creatingSession || selectedParticipantIds.length < 2}
              className="rounded-md border border-[#6ee7b7] bg-[#1e2533] px-3 py-2 text-xs font-semibold text-[#6ee7b7] hover:text-[#a7f3d0] disabled:opacity-70"
            >
              {creatingSession ? "Creating..." : "Create jam session"}
            </button>
          </div>
        ) : null}

        {createdSessionId ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#2a3344]">
            <table className="min-w-full text-xs">
              <thead className="bg-[#111722] text-left text-[10px] uppercase tracking-wide text-[#8b95a8]">
                <tr>
                  <th className="px-3 py-2">Song</th>
                  <th className="px-3 py-2">Artist</th>
                  <th className="px-3 py-2">Score</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((song) => (
                  <tr
                    key={song.songId}
                    className="cursor-pointer border-t border-[#2a3344] text-[#e8ecf4] hover:bg-[#1a2230]"
                    onClick={() => setSongDetails(song)}
                  >
                    <td className="px-3 py-2">{song.title}</td>
                    <td className="px-3 py-2">{song.artist}</td>
                    <td className="px-3 py-2 font-semibold text-[#6ee7b7]">{song.score.toFixed(2)}</td>
                  </tr>
                ))}
                {ranked.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-xs text-[#8b95a8]" colSpan={3}>
                      No songs available for ranking.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-[#2a3344] bg-[#111722] p-4">
            <p className="text-xs text-[#8b95a8]">Create the jam session to show the song list.</p>
          </div>
        )}
        {pickerOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-[#2a3344] bg-[#171c26]">
              <div className="sticky top-0 z-10 border-b border-[#2a3344] bg-[#171c26] p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[#8b95a8]">Select participants</h3>
                  <button
                    type="button"
                    className="rounded-md border border-[#2a3344] px-2 py-1 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
                    onClick={() => setPickerOpen(false)}
                  >
                    Close
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, email or username..."
                    className="min-w-[260px] flex-1 rounded-md border border-[#2a3344] bg-[#1e2533] px-3 py-2 text-sm text-[#e8ecf4]"
                  />
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value === "all" ? "all" : "friends")}
                    className="rounded-md border border-[#2a3344] bg-[#1e2533] px-2 py-2 text-xs font-semibold text-[#e8ecf4]"
                  >
                    <option value="friends">Only my friends</option>
                    <option value="all">All users</option>
                  </select>
                </div>
              </div>
              {searchError ? <p className="px-4 pt-2 text-xs text-[#fca5a5]">{searchError}</p> : null}
              <div className="max-h-80 overflow-auto rounded-md">
                {searchLoading ? <p className="p-3 text-xs text-[#8b95a8]">Searching...</p> : null}
                {!searchLoading && searchResults.length === 0 ? <p className="p-3 text-xs text-[#8b95a8]">No users found.</p> : null}
                {!searchLoading
                  ? searchResults.map((person) => {
                      const selected = selectedSet.has(person.id);
                      return (
                        <div key={person.id} className="flex items-center justify-between border-t border-[#2a3344] px-3 py-2 first:border-t-0">
                          <div className="min-w-0">
                            <p className="truncate text-sm text-[#e8ecf4]">{person.label}</p>
                            <p className="truncate text-xs text-[#8b95a8]">{person.email ?? "No email"}</p>
                          </div>
                          <button
                            type="button"
                            className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                              selected
                                ? "border-[#6ee7b7] text-[#6ee7b7]"
                                : "border-[#2a3344] text-[#8b95a8] hover:text-[#e8ecf4]"
                            }`}
                            onClick={() => toggleParticipant(person.id)}
                          >
                            {selected ? "Selected" : "Select"}
                          </button>
                        </div>
                      );
                    })
                  : null}
              </div>
              <div className="sticky bottom-0 z-10 flex justify-end border-t border-[#2a3344] bg-[#171c26] p-3">
                <button
                  type="button"
                  className="cursor-pointer rounded-md border border-[#2a3344] bg-[#1e2533] px-3 py-1.5 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
                  onClick={() => setPickerOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <ShareViaAppsDialog
          dialogRef={jamShareDialogRef}
          payload={jamSharePayload}
          idPrefix="jam-plan-share"
          onClose={() => setJamSharePayload(null)}
        />
        {songDetails ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg rounded-xl border border-[#2a3344] bg-[#171c26] p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#8b95a8]">Song details</h3>
              <p className="mt-2 text-sm text-[#e8ecf4]">
                {songDetails.title} - {songDetails.artist}
              </p>

              <div className="mt-3 grid gap-2 text-xs text-[#8b95a8]">
                <p>
                  <strong className="text-[#e8ecf4]">Score:</strong> {songDetails.score.toFixed(2)}
                </p>
                <p>
                  Coverage: {songDetails.uniqueKnownByCount}/{Math.max(1, selectedParticipantIds.length)} musicians (
                  {Math.round(songDetails.participantCoverage * 100)}%)
                  {songDetails.knownByCount > songDetails.uniqueKnownByCount
                    ? ` · repertoire emphasis +${songDetails.knownByCount - songDetails.uniqueKnownByCount}`
                    : ""}
                  {" · "}participant score {songDetails.participantScore.toFixed(2)}
                </p>
                <p>
                  History score: {(20 / (1 + songDetails.playCount)).toFixed(2)} (play count: {songDetails.playCount})
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {songDetails.lyricsUrl ? (
                  <a
                    href={songDetails.lyricsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-[#2a3344] px-2 py-1 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
                  >
                    Lyrics
                  </a>
                ) : (
                  <span className="rounded-md border border-[#2a3344] px-2 py-1 text-xs text-[#5f6b80]">No lyrics link</span>
                )}
                {songDetails.listenUrl ? (
                  <a
                    href={songDetails.listenUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-[#2a3344] px-2 py-1 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
                  >
                    Listen
                  </a>
                ) : (
                  <span className="rounded-md border border-[#2a3344] px-2 py-1 text-xs text-[#5f6b80]">No listen link</span>
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  className="rounded-md border border-[#2a3344] px-3 py-1.5 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
                  onClick={() => setSongDetails(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
