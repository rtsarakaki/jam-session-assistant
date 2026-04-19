"use client";

import { useState } from "react";
import { markJamSongPlayedAction, requestJoinJamSessionAction, reviewJoinJamSessionAction } from "@/lib/actions/jam-session-actions";

type JamSessionPanelProps = {
  sessionId: string;
  title: string;
  isOwner: boolean;
  isParticipant: boolean;
  participants: Array<{ id: string; label: string }>;
  songs: Array<{ id: string; title: string; artist: string; playedAt: string | null }>;
  pendingJoinRequests: Array<{ id: string; requesterId: string; requesterLabel: string }>;
  myJoinRequestStatus: "none" | "pending" | "approved" | "rejected";
};

export function JamSessionPanel({
  sessionId,
  title,
  isOwner,
  isParticipant,
  participants,
  songs: initialSongs,
  pendingJoinRequests,
  myJoinRequestStatus,
}: JamSessionPanelProps) {
  const [songs, setSongs] = useState(initialSongs);
  const [error, setError] = useState<string | null>(null);
  const [requestingJoin, setRequestingJoin] = useState(false);
  const [processingJoinRequestId, setProcessingJoinRequestId] = useState<string | null>(null);

  async function togglePlayed(sessionSongId: string, played: boolean) {
    setError(null);
    const result = await markJamSongPlayedAction({ sessionSongId, sessionId, played: !played });
    if (result.error) {
      setError(result.error);
      return;
    }
    setSongs((prev) => prev.map((song) => (song.id === sessionSongId ? { ...song, playedAt: played ? null : new Date().toISOString() } : song)));
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

  return (
    <main id="app-main" className="mx-auto w-full max-w-5xl pb-8">
      <section className="rounded-2xl border border-[#2a3344] bg-[#171c26] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.22)] sm:p-5">
        <h2 className="m-0 text-xl font-semibold text-[#e8ecf4]">{title}</h2>
        <p className="mt-2 text-xs text-[#8b95a8]">Session id: {sessionId}</p>
        {error ? <p className="mt-2 text-xs text-[#fca5a5]">{error}</p> : null}

        {!isParticipant && !isOwner ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={requestJoin}
              disabled={requestingJoin || myJoinRequestStatus === "pending"}
              className="rounded-md border border-[#2a3344] px-3 py-2 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4] disabled:opacity-70"
            >
              {myJoinRequestStatus === "pending" ? "Join request pending" : requestingJoin ? "Requesting..." : "Request to join jam"}
            </button>
          </div>
        ) : null}

        <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-[#8b95a8]">Participants</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {participants.map((participant) => (
            <span key={participant.id} className="rounded-md border border-[#2a3344] bg-[#1e2533] px-2 py-1 text-xs text-[#e8ecf4]">
              {participant.label}
            </span>
          ))}
        </div>

        {isOwner && pendingJoinRequests.length > 0 ? (
          <>
            <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-[#8b95a8]">Pending join requests</h3>
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
        <div className="mt-2 overflow-x-auto rounded-xl border border-[#2a3344]">
          <table className="min-w-full text-xs">
            <thead className="bg-[#111722] text-left text-[10px] uppercase tracking-wide text-[#8b95a8]">
              <tr>
                <th className="px-3 py-2">Song</th>
                <th className="px-3 py-2">Artist</th>
                <th className="px-3 py-2">Played</th>
              </tr>
            </thead>
            <tbody>
              {songs.map((song) => (
                <tr key={song.id} className="border-t border-[#2a3344] text-[#e8ecf4]">
                  <td className="px-3 py-2">{song.title}</td>
                  <td className="px-3 py-2">{song.artist}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={!isOwner && !isParticipant}
                      onClick={() => togglePlayed(song.id, !!song.playedAt)}
                      className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                        song.playedAt ? "border-[#6ee7b7] text-[#6ee7b7]" : "border-[#2a3344] text-[#8b95a8]"
                      }`}
                    >
                      {song.playedAt ? "Played" : "Mark played"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
