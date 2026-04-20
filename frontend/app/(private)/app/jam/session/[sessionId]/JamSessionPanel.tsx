"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  addJamParticipantAction,
  markJamSongPlayedAction,
  removeJamParticipantAction,
  requestJoinJamSessionAction,
  reviewJoinJamSessionAction,
  setFollowFromJamAction,
  toggleJamSongRequestAction,
} from "@/lib/actions/jam-session-actions";
import { searchJamParticipantsAction, type JamParticipantSearchResult, type JamParticipantSearchScope } from "@/lib/actions/jam-actions";
import { buildJamInviteSharePayload, ShareViaAppsDialog, type ShareViaAppsPayload } from "@/components/sharing/share-via-apps-dialog";
import { buildJamEffectiveKnownByList, jamParticipantKnownRollup, profilePlaysAnySongInJam } from "@/lib/jam/jam-known-by-score";
import { PanelTabButton } from "@/components/buttons/PanelTabButton";

type JamSessionPanelProps = {
  sessionId: string;
  title: string;
  createdBy: string;
  viewerId: string;
  isOwner: boolean;
  isParticipant: boolean;
  participants: Array<{
    id: string;
    label: string;
    avatarUrl: string | null;
    isFollowing: boolean;
    instruments: string[];
  }>;
  songs: Array<{
    id: string;
    songId: string;
    title: string;
    artist: string;
    lyricsUrl: string | null;
    listenUrl: string | null;
    playedAt: string | null;
    knownByProfileIds: string[];
    knownByCount: number;
    uniqueKnownByCount: number;
    participantCoverage: number;
    participantScore: number;
    playCount: number;
    requestCount: number;
    requestedByViewer: boolean;
    score: number;
  }>;
  pendingJoinRequests: Array<{ id: string; requesterId: string; requesterLabel: string }>;
  myJoinRequestStatus: "none" | "pending" | "approved" | "rejected";
};

export function JamSessionPanel({
  sessionId,
  title,
  createdBy,
  viewerId,
  isOwner,
  isParticipant,
  participants: initialParticipants,
  songs: initialSongs,
  pendingJoinRequests,
  myJoinRequestStatus,
}: JamSessionPanelProps) {
  const router = useRouter();
  const [songs, setSongs] = useState(initialSongs);
  const [participants, setParticipants] = useState(initialParticipants);

  useEffect(() => {
    startTransition(() => {
      setSongs(initialSongs);
    });
  }, [initialSongs]);

  useEffect(() => {
    startTransition(() => {
      setParticipants(initialParticipants);
    });
  }, [initialParticipants]);
  const [error, setError] = useState<string | null>(null);
  const [requestingJoin, setRequestingJoin] = useState(false);
  const [processingJoinRequestId, setProcessingJoinRequestId] = useState<string | null>(null);
  const [followBusyUserId, setFollowBusyUserId] = useState<string | null>(null);
  const [songDetails, setSongDetails] = useState<(typeof initialSongs)[number] | null>(null);
  const [markingSongId, setMarkingSongId] = useState<string | null>(null);
  const [requestingSongId, setRequestingSongId] = useState<string | null>(null);
  const [participantBusyUserId, setParticipantBusyUserId] = useState<string | null>(null);
  const [participantPickerOpen, setParticipantPickerOpen] = useState(false);
  const [participantScope, setParticipantScope] = useState<JamParticipantSearchScope>("friends");
  const [participantQuery, setParticipantQuery] = useState("");
  const [participantSearchLoading, setParticipantSearchLoading] = useState(false);
  const [participantSearchError, setParticipantSearchError] = useState<string | null>(null);
  const [participantSearchResults, setParticipantSearchResults] = useState<JamParticipantSearchResult[]>([]);
  const [songTab, setSongTab] = useState<"pending" | "played">("pending");
  const [jamSharePayload, setJamSharePayload] = useState<ShareViaAppsPayload | null>(null);
  const jamShareDialogRef = useRef<HTMLDialogElement>(null);
  const [sessionInviteUrl, setSessionInviteUrl] = useState("");

  useEffect(() => {
    startTransition(() => {
      setSessionInviteUrl(`${window.location.origin}/app/jam/session/${sessionId}`);
    });
  }, [sessionId]);

  const scoredSongs = useMemo(() => {
    const participantIds = participants.map((p) => p.id);
    const participantCount = Math.max(1, participantIds.length);
    const playsAnyById = new Map(participants.map((p) => [p.id, profilePlaysAnySongInJam(p.instruments)]));

    const rows = songs.map((song) => {
      const effective = buildJamEffectiveKnownByList(song.knownByProfileIds, participantIds, playsAnyById);
      const { knownByCount, uniqueKnownByCount, participantCoverage, participantScore } = jamParticipantKnownRollup(
        effective,
        participantCount,
      );
      const historyScore = 20 / (1 + song.playCount);
      const requestScore = Math.min(20, song.requestCount * 4);
      const score = Number((participantScore + historyScore + requestScore).toFixed(2));
      return { ...song, knownByCount, uniqueKnownByCount, participantCoverage, participantScore, score };
    });
    rows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const t = a.title.localeCompare(b.title, "en", { sensitivity: "base" });
      if (t !== 0) return t;
      return a.songId.localeCompare(b.songId);
    });
    return rows;
  }, [songs, participants]);

  const pendingSongs = scoredSongs.filter((song) => !song.playedAt);
  const playedSongs = scoredSongs.filter((song) => !!song.playedAt);
  const visibleSongs = songTab === "pending" ? pendingSongs : playedSongs;

  async function togglePlayed(sessionSongId: string, played: boolean) {
    if (markingSongId) return;
    setMarkingSongId(sessionSongId);
    setError(null);
    try {
      const result = await markJamSongPlayedAction({ sessionSongId, sessionId, played: !played });
      if (result.error) {
        setError(result.error);
        return;
      }
      const willMarkPlayed = !played;
      if (willMarkPlayed) {
        setSongs((prev) =>
          prev.map((song) => (song.id === sessionSongId ? { ...song, playedAt: new Date().toISOString() } : song)),
        );
        router.refresh();
        return;
      }
      setSongs((prev) => prev.map((song) => (song.id === sessionSongId ? { ...song, playedAt: null } : song)));
    } finally {
      setMarkingSongId(null);
    }
  }

  async function toggleRequested(songId: string, requested: boolean) {
    if (requestingSongId) return;
    setRequestingSongId(songId);
    setError(null);
    try {
      const result = await toggleJamSongRequestAction({
        sessionId,
        songId,
        requested,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSongs((prev) =>
        prev.map((song) => {
          if (song.songId !== songId) return song;
          const nextRequested = !requested;
          const nextRequestCount = Math.max(0, song.requestCount + (nextRequested ? 1 : -1));
          return {
            ...song,
            requestedByViewer: nextRequested,
            requestCount: nextRequestCount,
          };
        }),
      );
    } finally {
      setRequestingSongId(null);
    }
  }

  useEffect(() => {
    if (!jamSharePayload) return;
    const el = jamShareDialogRef.current;
    if (el && !el.open) el.showModal();
  }, [jamSharePayload]);

  function openJamSendDialog() {
    if (!sessionInviteUrl) return;
    setJamSharePayload(buildJamInviteSharePayload(sessionInviteUrl, title));
  }

  async function requestJoin() {
    if (requestingJoin) return;
    setRequestingJoin(true);
    setError(null);
    try {
      const result = await requestJoinJamSessionAction({ sessionId });
      if (result.error) {
        setError(result.error);
      }
    } finally {
      setRequestingJoin(false);
    }
  }

  async function reviewJoin(requestId: string, requesterId: string, approve: boolean) {
    if (processingJoinRequestId) return;
    setProcessingJoinRequestId(requestId);
    setError(null);
    try {
      const result = await reviewJoinJamSessionAction({
        requestId,
        requesterId,
        sessionId,
        approve,
      });
      if (result.error) setError(result.error);
    } finally {
      setProcessingJoinRequestId(null);
    }
  }

  async function toggleFollow(targetUserId: string, currentlyFollowing: boolean) {
    if (followBusyUserId) return;
    setFollowBusyUserId(targetUserId);
    setError(null);
    try {
      const result = await setFollowFromJamAction({
        targetUserId,
        follow: !currentlyFollowing,
        sessionId,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setParticipants((prev) => prev.map((participant) => (participant.id === targetUserId ? { ...participant, isFollowing: !currentlyFollowing } : participant)));
    } finally {
      setFollowBusyUserId(null);
    }
  }

  async function addParticipant(profileId: string, label: string, instruments: string[]) {
    if (participantBusyUserId) return;
    setParticipantBusyUserId(profileId);
    setError(null);
    try {
      const result = await addJamParticipantAction({ sessionId, profileId });
      if (result.error) {
        setError(result.error);
        return;
      }
      setParticipants((prev) => {
        if (prev.some((p) => p.id === profileId)) return prev;
        return [...prev, { id: profileId, label, avatarUrl: null, isFollowing: false, instruments }];
      });
    } finally {
      setParticipantBusyUserId(null);
    }
  }

  async function removeParticipant(profileId: string) {
    if (participantBusyUserId) return;
    setParticipantBusyUserId(profileId);
    setError(null);
    try {
      const result = await removeJamParticipantAction({ sessionId, profileId });
      if (result.error) {
        setError(result.error);
        return;
      }
      setParticipants((prev) => prev.filter((p) => p.id !== profileId));
    } finally {
      setParticipantBusyUserId(null);
    }
  }

  async function searchParticipants() {
    setParticipantSearchLoading(true);
    setParticipantSearchError(null);
    const result = await searchJamParticipantsAction({
      query: participantQuery,
      scope: participantScope,
      limit: 80,
    });
    if (result.error) {
      setParticipantSearchError(result.error);
      setParticipantSearchResults([]);
    } else {
      setParticipantSearchResults(result.results);
    }
    setParticipantSearchLoading(false);
  }

  return (
    <main id="app-main" className="mx-auto w-full max-w-5xl pb-8">
      <section className="rounded-2xl border border-[#2a3344] bg-[#171c26] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.22)] sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="m-0 text-xl font-semibold text-[#e8ecf4]">{title}</h2>
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
        <p className="mt-2 text-xs text-[#8b95a8]">Session id: {sessionId}</p>
        {error ? <p className="mt-2 text-xs text-[#fca5a5]">{error}</p> : null}

        {!isParticipant && !isOwner ? (
          <div className="mt-3">
            <p className="mb-2 text-xs text-[#8b95a8]">
              You can view this jam data. Request below only if you want to participate as musician.
            </p>
            <button
              type="button"
              onClick={requestJoin}
              disabled={requestingJoin || myJoinRequestStatus === "pending"}
              className="rounded-md border border-[#2a3344] px-3 py-2 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4] disabled:opacity-70"
            >
              {myJoinRequestStatus === "pending" ? "Participation request pending" : requestingJoin ? "Requesting..." : "Request musician participation"}
            </button>
          </div>
        ) : null}

        <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-[#8b95a8]">Participants</h3>
        {isOwner ? (
          <div className="mt-2">
            <button
              type="button"
              className="rounded-md border border-[#2a3344] px-2 py-1 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
              onClick={() => {
                setParticipantPickerOpen(true);
                void searchParticipants();
              }}
            >
              Add participant
            </button>
          </div>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          {participants.map((participant) => (
            <div key={participant.id} className="flex items-center gap-2 rounded-md border border-[#2a3344] bg-[#1e2533] px-2 py-1 text-xs text-[#e8ecf4]">
              {participant.avatarUrl ? (
                <img src={participant.avatarUrl} alt={participant.label} className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2a3344] text-[10px] font-semibold text-[#c9d3e7]">
                  {participant.label.charAt(0).toUpperCase()}
                </span>
              )}
              <span>{participant.label}</span>
              {participant.id === createdBy ? (
                <span className="rounded-md border border-[#6ee7b7] bg-[color-mix(in_srgb,#6ee7b7_12%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold text-[#6ee7b7]">
                  Owner
                </span>
              ) : null}
              {participant.id !== viewerId ? (
                <button
                  type="button"
                  disabled={followBusyUserId === participant.id}
                  className="rounded-md border border-[#2a3344] px-2 py-0.5 text-[10px] font-semibold text-[#8b95a8] hover:text-[#e8ecf4] disabled:opacity-70"
                  onClick={() => toggleFollow(participant.id, participant.isFollowing)}
                >
                  {participant.isFollowing ? "Unfollow" : "Follow"}
                </button>
              ) : null}
              {isOwner && participant.id !== createdBy ? (
                <button
                  type="button"
                  disabled={participantBusyUserId === participant.id}
                  className="rounded-md border border-[#2a3344] px-2 py-0.5 text-[10px] font-semibold text-[#fca5a5] hover:text-[#fecaca] disabled:opacity-70"
                  onClick={() => removeParticipant(participant.id)}
                >
                  {participantBusyUserId === participant.id ? "..." : "Remove"}
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {isOwner && pendingJoinRequests.length > 0 ? (
          <>
            <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-[#8b95a8]">Pending musician requests</h3>
            <div className="mt-2 space-y-2">
              {pendingJoinRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between rounded-md border border-[#2a3344] bg-[#111722] px-3 py-2">
                  <span className="text-sm text-[#e8ecf4]">{request.requesterLabel}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => reviewJoin(request.id, request.requesterId, true)}
                      disabled={processingJoinRequestId === request.id}
                      className="rounded-md border border-[#6ee7b7] px-2 py-1 text-xs font-semibold text-[#6ee7b7]"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => reviewJoin(request.id, request.requesterId, false)}
                      disabled={processingJoinRequestId === request.id}
                      className="rounded-md border border-[#fca5a5] px-2 py-1 text-xs font-semibold text-[#fca5a5]"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}

        <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-[#8b95a8]">Songs</h3>
        <p className="mt-1 text-[10px] text-[#8b95a8]">
          When you mark a song as played, the best-scoring catalog track that is not already in this session is appended to the list.
        </p>
        <div className="mt-2 flex gap-2 border-b border-[#2a3344] pb-2">
          <PanelTabButton id="jam-songs-tab-pending" selected={songTab === "pending"} onClick={() => setSongTab("pending")} controlsId="jam-songs-pending">
            Pending ({pendingSongs.length})
          </PanelTabButton>
          <PanelTabButton id="jam-songs-tab-played" selected={songTab === "played"} onClick={() => setSongTab("played")} controlsId="jam-songs-played">
            Played ({playedSongs.length})
          </PanelTabButton>
        </div>
        <div className="mt-2 overflow-x-auto rounded-xl border border-[#2a3344]">
          <table className="min-w-full text-[11px]">
            <thead className="bg-[#111722] text-left text-[9px] uppercase tracking-wide text-[#8b95a8]">
              <tr>
                <th className="px-2 py-1.5">Song</th>
                <th className="px-2 py-1.5">Artist</th>
                <th className="px-2 py-1.5">Score</th>
                <th className="px-2 py-1.5">Played</th>
              </tr>
            </thead>
            <tbody>
              {visibleSongs.map((song) => (
                <tr
                  key={song.id}
                  className={`cursor-pointer border-t border-[#2a3344] text-[#e8ecf4] hover:bg-[#1a2230] ${
                    song.requestCount > 0 ? "bg-[color-mix(in_srgb,#6ee7b7_10%,#171c26)]" : ""
                  }`}
                  onClick={() => setSongDetails(song)}
                >
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <span>{song.title}</span>
                      {song.requestCount > 0 ? (
                        <span className="rounded-md border border-[#6ee7b7]/60 bg-[color-mix(in_srgb,#6ee7b7_16%,transparent)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#6ee7b7]">
                          Audience request{song.requestCount > 1 ? "s" : ""}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-2 py-1.5">{song.artist}</td>
                  <td className="px-2 py-1.5 font-semibold text-[#6ee7b7]">{song.score.toFixed(2)}</td>
                  <td className="px-2 py-1.5">
                    {isParticipant ? (
                      <button
                        type="button"
                        disabled={markingSongId === song.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void togglePlayed(song.id, !!song.playedAt);
                        }}
                        className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                          song.playedAt ? "border-[#6ee7b7] text-[#6ee7b7]" : "border-[#2a3344] text-[#8b95a8]"
                        }`}
                      >
                        {markingSongId === song.id ? "Saving..." : song.playedAt ? "Played" : "Mark played"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={requestingSongId === song.songId}
                        onClick={(e) => {
                          e.stopPropagation();
                          void toggleRequested(song.songId, song.requestedByViewer);
                        }}
                        className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                          song.requestedByViewer ? "border-[#6ee7b7] text-[#6ee7b7]" : "border-[#2a3344] text-[#8b95a8]"
                        }`}
                      >
                        {requestingSongId === song.songId ? "Saving..." : song.requestedByViewer ? "Requested" : "Request to play"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {visibleSongs.length === 0 ? (
                <tr>
                  <td className="px-2 py-2 text-[11px] text-[#8b95a8]" colSpan={4}>
                    {songTab === "pending" ? "No pending songs." : "No played songs yet."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
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
                  Coverage: {songDetails.uniqueKnownByCount}/{Math.max(1, participants.length)} musicians (
                  {Math.round(songDetails.participantCoverage * 100)}%)
                  {songDetails.knownByCount > songDetails.uniqueKnownByCount
                    ? ` · repertoire emphasis +${songDetails.knownByCount - songDetails.uniqueKnownByCount}`
                    : ""}
                  {" · "}participant score {songDetails.participantScore.toFixed(2)}
                </p>
                <p>
                  History score: {(20 / (1 + songDetails.playCount)).toFixed(2)} (play count: {songDetails.playCount})
                </p>
                <p>
                  Request score: {Math.min(20, songDetails.requestCount * 4).toFixed(2)} (requests: {songDetails.requestCount})
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
        {participantPickerOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-2xl rounded-xl border border-[#2a3344] bg-[#171c26] p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[#8b95a8]">Add participants</h3>
                <button
                  type="button"
                  className="rounded-md border border-[#2a3344] px-2 py-1 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
                  onClick={() => setParticipantPickerOpen(false)}
                >
                  Close
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={participantQuery}
                  onChange={(e) => setParticipantQuery(e.target.value)}
                  placeholder="Search by name, email or username..."
                  className="min-w-[260px] flex-1 rounded-md border border-[#2a3344] bg-[#1e2533] px-3 py-2 text-sm text-[#e8ecf4]"
                />
                <select
                  value={participantScope}
                  onChange={(e) => setParticipantScope(e.target.value === "all" ? "all" : "friends")}
                  className="rounded-md border border-[#2a3344] bg-[#1e2533] px-2 py-2 text-xs font-semibold text-[#e8ecf4]"
                >
                  <option value="friends">Only my friends</option>
                  <option value="all">All users</option>
                </select>
                <button
                  type="button"
                  className="rounded-md border border-[#2a3344] px-2 py-2 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
                  onClick={() => void searchParticipants()}
                >
                  Search
                </button>
              </div>
              {participantSearchError ? <p className="mt-2 text-xs text-[#fca5a5]">{participantSearchError}</p> : null}
              <div className="mt-3 max-h-80 overflow-auto rounded-md border border-[#2a3344]">
                {participantSearchLoading ? <p className="p-3 text-xs text-[#8b95a8]">Searching...</p> : null}
                {!participantSearchLoading && participantSearchResults.length === 0 ? (
                  <p className="p-3 text-xs text-[#8b95a8]">No users found.</p>
                ) : null}
                {!participantSearchLoading
                  ? participantSearchResults.map((person) => {
                      const alreadyInSession = participants.some((p) => p.id === person.id);
                      return (
                        <div key={person.id} className="flex items-center justify-between border-t border-[#2a3344] px-3 py-2 first:border-t-0">
                          <div className="min-w-0">
                            <p className="truncate text-sm text-[#e8ecf4]">{person.label}</p>
                            <p className="truncate text-xs text-[#8b95a8]">{person.email ?? "No email"}</p>
                          </div>
                          <button
                            type="button"
                            disabled={alreadyInSession || participantBusyUserId === person.id}
                            className="rounded-md border border-[#2a3344] px-2 py-1 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4] disabled:opacity-70"
                            onClick={() => addParticipant(person.id, person.label, person.instruments)}
                          >
                            {alreadyInSession ? "Added" : participantBusyUserId === person.id ? "Adding..." : "Add"}
                          </button>
                        </div>
                      );
                    })
                  : null}
              </div>
            </div>
          </div>
        ) : null}
        <ShareViaAppsDialog
          dialogRef={jamShareDialogRef}
          payload={jamSharePayload}
          idPrefix="jam-session-share"
          onClose={() => setJamSharePayload(null)}
        />
      </section>
    </main>
  );
}
