"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FriendCard } from "@/app/(private)/app/friends/FriendCard";
import { mutateFollowAction } from "@/app/(private)/app/friends/friends-actions";
import {
  friendsFollowMutationInitialState,
  type FriendsFollowMutationState,
} from "@/app/(private)/app/friends/friends-follow-state";
import { FormErrorBanner } from "@/components/feedback";
import type { FriendsSnapshot, PublicProfileCard } from "@/lib/platform/friends-service";

type TabId = "following" | "fof" | "everyone";

function matchesSearch(card: PublicProfileCard, q: string): boolean {
  if (!q) return true;
  const hay = `${card.listName} ${card.instruments.join(" ")} ${card.bio ?? ""}`.toLowerCase();
  return hay.includes(q);
}

type FriendsPanelProps = {
  snapshot: FriendsSnapshot;
};

const friendsGridClass =
  "mt-4 grid w-full min-w-0 grid-cols-2 gap-3 min-[380px]:grid-cols-3 min-[480px]:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8";

export function FriendsPanel({ snapshot }: FriendsPanelProps) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("following");
  const [qFollowing, setQFollowing] = useState("");
  const [qFof, setQFof] = useState("");
  const [qEveryone, setQEveryone] = useState("");

  const [state, formAction, pending] = useActionState<FriendsFollowMutationState, FormData>(
    mutateFollowAction,
    friendsFollowMutationInitialState,
  );

  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending) {
      router.refresh();
    }
    wasPending.current = pending;
  }, [pending, router]);

  const followingSet = useMemo(() => new Set(snapshot.followingIds), [snapshot.followingIds]);
  const fofSet = useMemo(() => new Set(snapshot.friendsOfFriendsIds), [snapshot.friendsOfFriendsIds]);

  const followingCards = useMemo(() => {
    return snapshot.directory.filter((c) => followingSet.has(c.id));
  }, [snapshot.directory, followingSet]);

  const fofCards = useMemo(() => {
    return snapshot.directory.filter((c) => fofSet.has(c.id));
  }, [snapshot.directory, fofSet]);

  const q =
    tab === "following" ? qFollowing.trim().toLowerCase() : tab === "fof" ? qFof.trim().toLowerCase() : qEveryone.trim().toLowerCase();

  const visibleCards = useMemo(() => {
    const base = tab === "following" ? followingCards : tab === "fof" ? fofCards : snapshot.directory;
    return base.filter((c) => matchesSearch(c, q)).sort((a, b) => a.listName.localeCompare(b.listName, "en"));
  }, [tab, followingCards, fofCards, snapshot.directory, q]);

  const emptyMessage =
    tab === "following"
      ? "You are not following anyone yet, or no one matches this search."
      : tab === "fof"
        ? "No suggestions yet — follow people to see who their network plays with. Try a different search."
        : "No one matches this search.";

  return (
    <main id="app-main" className="mx-auto max-w-6xl py-6">
      <h1 className="m-0 text-2xl font-bold tracking-tight text-[#6ee7b7]">Friends</h1>
      <p className="mt-2 text-sm leading-relaxed text-[#8b95a8]">
        People you follow, suggestions from their follows (friends of friends), or browse everyone. Each tab has its own
        search (name or instrument).
      </p>

      <FormErrorBanner message={state.error} className="mt-6" />

      <div
        className="mt-6 flex flex-wrap gap-1 border-b border-[#2a3344] pb-px"
        role="tablist"
        aria-label="Friends views"
      >
        {(
          [
            { id: "following" as const, label: "Following" },
            { id: "fof" as const, label: "Friends of friends" },
            { id: "everyone" as const, label: "Everyone" },
          ] as const
        ).map((t) => {
          const selected = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`rounded-t-lg px-3 py-2 text-sm font-medium transition-colors ${
                selected
                  ? "border border-b-0 border-[#2a3344] bg-[#171c26] text-[#6ee7b7]"
                  : "border border-transparent text-[#8b95a8] hover:text-[#e8ecf4]"
              }`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-b-xl rounded-tr-xl border border-t-0 border-[#2a3344] bg-[#171c26]/50 p-4">
        {tab === "following" ? (
          <div className="space-y-3">
            <label className="sr-only" htmlFor="friends-q-following">
              Search following
            </label>
            <input
              id="friends-q-following"
              type="search"
              value={qFollowing}
              onChange={(e) => setQFollowing(e.target.value)}
              placeholder="Search following (name or instrument)…"
              autoComplete="off"
              className="w-full rounded-lg border border-[#2a3344] bg-[#0f1218] px-3 py-2 text-sm text-[#e8ecf4] placeholder:text-[#5c6678] focus:border-[#6ee7b7]/50 focus:outline-none"
            />
          </div>
        ) : null}

        {tab === "fof" ? (
          <div className="space-y-3">
            <p className="m-0 text-sm text-[#8b95a8]">
              Suggestions are people your follows follow, excluding you and people you already follow.
            </p>
            <label className="sr-only" htmlFor="friends-q-fof">
              Search friends of friends
            </label>
            <input
              id="friends-q-fof"
              type="search"
              value={qFof}
              onChange={(e) => setQFof(e.target.value)}
              placeholder="Search suggestions (name or instrument)…"
              autoComplete="off"
              className="w-full rounded-lg border border-[#2a3344] bg-[#0f1218] px-3 py-2 text-sm text-[#e8ecf4] placeholder:text-[#5c6678] focus:border-[#6ee7b7]/50 focus:outline-none"
            />
          </div>
        ) : null}

        {tab === "everyone" ? (
          <div className="space-y-3">
            <label className="sr-only" htmlFor="friends-q-everyone">
              Search everyone
            </label>
            <input
              id="friends-q-everyone"
              type="search"
              value={qEveryone}
              onChange={(e) => setQEveryone(e.target.value)}
              placeholder="Search everyone (name or instrument)…"
              autoComplete="off"
              className="w-full rounded-lg border border-[#2a3344] bg-[#0f1218] px-3 py-2 text-sm text-[#e8ecf4] placeholder:text-[#5c6678] focus:border-[#6ee7b7]/50 focus:outline-none"
            />
          </div>
        ) : null}

        <div className={friendsGridClass} aria-live="polite">
          {visibleCards.map((card) => (
            <FriendCard
              key={card.id}
              card={card}
              isFollowing={followingSet.has(card.id)}
              formAction={formAction}
              pending={pending}
            />
          ))}
        </div>

        {visibleCards.length === 0 ? <p className="mt-4 text-center text-sm text-[#8b95a8]">{emptyMessage}</p> : null}
      </div>
    </main>
  );
}
