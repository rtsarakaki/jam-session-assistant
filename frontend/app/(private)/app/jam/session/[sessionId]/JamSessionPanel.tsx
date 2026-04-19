"use client";

import { useState } from "react";
import { markJamSongPlayedAction, requestJoinJamSessionAction, reviewJoinJamSessionAction, setFollowFromJamAction } from "@/lib/actions/jam-session-actions";
import { PanelTabButton } from "@/components/buttons/PanelTabButton";

type JamSessionPanelProps = {
  sessionId: string;
  title: string;
  createdBy: string;
  viewerId: string;
  isOwner: boolean;
  isParticipant: boolean;
  participants: Array<{ id: string; label: string; avatarUrl: string | null; isFollowing: boolean }>;
  songs: Array<{
    id: string;
    songId: string;
    title: string;
    artist: string;
    lyricsUrl: string | null;
    listenUrl: string | null;
    playedAt: string | null;
    knownByCount: number;
    participantCoverage: number;
    playCount: number;
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
  const [songs, setSongs] = useState(initialSongs);
  const [participants, setParticipants] = useState(initialParticipants);
  const [error, setError] = useState<string | null>(null);
  const [requestingJoin, setRequestingJoin] = useState(false);
  const [processingJoinRequestId, setProcessingJoinRequestId] = useState<string | null>(null);
  const [followBusyUserId, setFollowBusyUserId] = useState<string | null>(null);
  const [songDetails, setSongDetails] = useState<(typeof initialSongs)[number] | null>(null);
  const [songTab, setSongTab] = useState<"pending" | "played">("pending");

  const pendingSongs = songs.filter((song) => !song.playedAt);
  const playedSongs = songs.filter((song) => !!song.playedAt);
  const visibleSongs = songTab === "pending" ? pendingSongs : playedSongs;

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

  return (
    <main id="app-main" className="mx-auto w-full max-w-5xl pb-8">
      <section className="rounded-2xl border border-[#2a3344] bg-[#171c26] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.22)] sm:p-5">
        <h2 className="m-0 text-xl font-semibold text-[#e8ecf4]">{title}</h2>
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
        <div className="mt-2 flex gap-2 border-b border-[#2a3344] pb-2">
          <PanelTabButton id="jam-songs-tab-pending" selected={songTab === "pending"} onClick={() => setSongTab("pending")} controlsId="jam-songs-pending">
            Pending ({pendingSongs.length})
          </PanelTabButton>
          <PanelTabButton id="jam-songs-tab-played" selected={songTab === "played"} onClick={() => setSongTab("played")} controlsId="jam-songs-played">
            Played ({playedSongs.length})
          </PanelTabButton>
        </div>
        <div className="mt-2 overflow-x-auto rounded-xl border border-[#2a3344]">
          <table className="min-w-full text-xs">
            <thead className="bg-[#111722] text-left text-[10px] uppercase tracking-wide text-[#8b95a8]">
              <tr>
                <th className="px-3 py-2">Song</th>
                <th className="px-3 py-2">Artist</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Played</th>
              </tr>
            </thead>
            <tbody>
              {visibleSongs.map((song) => (
                <tr
                  key={song.id}
                  className="cursor-pointer border-t border-[#2a3344] text-[#e8ecf4] hover:bg-[#1a2230]"
                  onClick={() => setSongDetails(song)}
                >
                  <td className="px-3 py-2">{song.title}</td>
                  <td className="px-3 py-2">{song.artist}</td>
                  <td className="px-3 py-2 font-semibold text-[#6ee7b7]">{song.score.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={!isOwner && !isParticipant}
                      onClick={(e) => {
                        e.stopPropagation();
                        void togglePlayed(song.id, !!song.playedAt);
                      }}
                      className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                        song.playedAt ? "border-[#6ee7b7] text-[#6ee7b7]" : "border-[#2a3344] text-[#8b95a8]"
                      }`}
                    >
                      {song.playedAt ? "Played" : "Mark played"}
                    </button>
                  </td>
                </tr>
              ))}
              {visibleSongs.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-xs text-[#8b95a8]" colSpan={4}>
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
                  Coverage: {songDetails.knownByCount}/{Math.max(1, participants.length)} ({Math.round(songDetails.participantCoverage * 100)}%)
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
