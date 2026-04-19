"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  friendsFollowMutationInitialState,
  mutateFollowAction,
  type FriendsFollowMutationState,
} from "@/app/(private)/app/friends/friends-actions";
import { FormErrorBanner } from "@/components/feedback";
import { getAvatarInitials } from "@/lib/auth/user-display";
import type { FriendsSnapshot, PublicProfileCard } from "@/lib/platform/friends-service";

type TabId = "following" | "fof" | "everyone";

function instrumentsLine(instruments: string[]): string {
  return instruments.length ? instruments.join(" · ") : "—";
}

function matchesSearch(card: PublicProfileCard, q: string): boolean {
  if (!q) return true;
  const hay = `${card.listName} ${card.instruments.join(" ")}`.toLowerCase();
  return hay.includes(q);
}

type FriendCardProps = {
  card: PublicProfileCard;
  isFollowing: boolean;
  formAction: (payload: FormData) => void;
  pending: boolean;
};

function FriendCard({ card, isFollowing, formAction, pending }: FriendCardProps) {
  const initials = getAvatarInitials(card.listName, undefined);

  return (
    <article
      className="flex flex-col gap-3 rounded-xl border border-[#2a3344] bg-[#171c26]/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      data-user-id={card.id}
    >
      <div className="flex gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#2a3344] bg-[#1e2533] text-xs font-semibold text-[#e8ecf4]"
          aria-hidden
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="m-0 truncate text-base font-semibold tracking-tight text-[#e8ecf4]">{card.listName}</h3>
          <p className="mt-1 text-sm leading-snug text-[#8b95a8]">{instrumentsLine(card.instruments)}</p>
        </div>
      </div>
      <form action={formAction} className="flex justify-end">
        <input type="hidden" name="targetUserId" value={card.id} />
        <input type="hidden" name="intent" value={isFollowing ? "unfollow" : "follow"} />
        <button
          type="submit"
          disabled={pending}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            isFollowing
              ? "border-[#6ee7b7]/45 bg-[color-mix(in_srgb,#6ee7b7_12%,transparent)] text-[#6ee7b7]"
              : "border-[#2a3344] bg-[#1e2533] text-[#e8ecf4] hover:border-[#3d4a60] hover:bg-[#232b3a]"
          }`}
        >
          {isFollowing ? "Following" : "Follow"}
        </button>
      </form>
    </article>
  );
}

type FriendsPanelProps = {
  snapshot: FriendsSnapshot;
};

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
    <main id="app-main" className="mx-auto max-w-3xl py-6">
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

        <div className="mt-4 grid gap-3 sm:grid-cols-2" aria-live="polite">
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
