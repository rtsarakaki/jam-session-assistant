"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createFriendFeedPostAction, loadFriendFeedPageAction } from "@/lib/actions/feed-actions";
import { ProfileAvatarBubble } from "@/components/avatar/ProfileAvatarBubble";
import { MintSlatePanelButton } from "@/components/buttons/MintSlatePanelButton";
import { ShowWhen } from "@/components/conditional";
import { getAvatarInitials } from "@/lib/auth/user-display";
import type { FriendFeedPostItem } from "@/lib/platform/feed-service";
import { formatProfileListName } from "@/lib/platform/friends-candidates";

function formatFeedTime(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return d.toLocaleString();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function bodyWithLinks(body: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  const re = /https?:\/\/[^\s]+/gi;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) {
      out.push(<span key={`t-${key++}`}>{body.slice(last, m.index)}</span>);
    }
    const href = m[0];
    out.push(
      <a
        key={`a-${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-[#6ee7b7] underline decoration-[#6ee7b7]/50 underline-offset-2 hover:decoration-[#6ee7b7]"
      >
        {href}
      </a>,
    );
    last = m.index + href.length;
  }
  if (last < body.length) {
    out.push(<span key={`t-${key++}`}>{body.slice(last)}</span>);
  }
  return out.length ? out : [<span key="empty">{body}</span>];
}

type FeedPanelProps = {
  myUserId: string;
  initialItems: FriendFeedPostItem[];
  initialNextCursor: { createdAt: string; id: string } | null;
};

export function FeedPanel({ myUserId, initialItems, initialNextCursor }: FeedPanelProps) {
  const formId = useId();
  const [items, setItems] = useState<FriendFeedPostItem[]>(initialItems);
  const [nextCursor, setNextCursor] = useState<{ createdAt: string; id: string } | null>(initialNextCursor);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const nextCursorRef = useRef(initialNextCursor);
  const loadBusyRef = useRef(false);

  useEffect(() => {
    nextCursorRef.current = nextCursor;
  }, [nextCursor]);

  const loadMore = useCallback(async () => {
    const cursor = nextCursorRef.current;
    if (loadBusyRef.current || !cursor) return;
    loadBusyRef.current = true;
    setLoadingMore(true);
    setListError(null);
    const res = await loadFriendFeedPageAction({ cursor });
    setLoadingMore(false);
    loadBusyRef.current = false;
    if (res.error) {
      setListError(res.error);
      return;
    }
    const batch = res.items ?? [];
    if (batch.length > 0) {
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const merged = [...prev];
        for (const row of batch) {
          if (!seen.has(row.id)) {
            seen.add(row.id);
            merged.push(row);
          }
        }
        return merged;
      });
    }
    const next = res.nextCursor ?? null;
    setNextCursor(next);
    nextCursorRef.current = next;
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !nextCursor) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loadBusyRef.current) return;
        void loadMore();
      },
      { root: null, rootMargin: "160px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [nextCursor, loadMore]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (posting) return;
    setPosting(true);
    setPostError(null);
    const res = await createFriendFeedPostAction(draft);
    setPosting(false);
    if (res.error) {
      setPostError(res.error);
      return;
    }
    setDraft("");
    const page = await loadFriendFeedPageAction({ cursor: null });
    if (page.error) {
      setPostError(page.error);
      return;
    }
    setItems(page.items ?? []);
    setNextCursor(page.nextCursor ?? null);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <form
        id={formId}
        onSubmit={onSubmit}
        className="rounded-xl border border-[#2a3344] bg-[#171c26]/90 p-3 shadow-[0_8px_28px_rgba(0,0,0,0.28)]"
      >
        <label htmlFor={`${formId}-body`} className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#8b95a8]">
          New post
        </label>
        <textarea
          id={`${formId}-body`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          maxLength={4000}
          placeholder="Gig tonight, address, flyer link, performance video…"
          className="mt-1.5 w-full resize-y rounded-lg border border-[#2a3344] bg-[#0f1218] px-2.5 py-2 text-[0.8125rem] leading-snug text-[#e8ecf4] placeholder:text-[#5c6678] focus:border-[#6ee7b7]/55 focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <MintSlatePanelButton type="submit" variant="mint" disabled={posting} className="w-auto min-w-28 px-4">
            {posting ? "Posting…" : "Post"}
          </MintSlatePanelButton>
          <Link
            href="/app/friends"
            className="text-[0.7rem] font-medium text-[#6ee7b7]/90 underline-offset-2 hover:underline"
          >
            Manage mutual friends
          </Link>
        </div>
        <ShowWhen when={!!postError}>
          <p className="mt-2 text-[0.7rem] text-[#fca5a5]" role="alert">
            {postError}
          </p>
        </ShowWhen>
      </form>

      <ShowWhen when={!!listError}>
        <p className="text-[0.7rem] text-[#fca5a5]" role="alert">
          {listError}
        </p>
      </ShowWhen>

      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {items.length === 0 ? (
          <li className="rounded-lg border border-dashed border-[#2a3344] px-3 py-6 text-center text-[0.75rem] text-[#8b95a8]">
            No posts yet. When you and another user follow each other, you will see each other&apos;s updates here.
          </li>
        ) : null}
        {items.map((post) => {
          const listName = formatProfileListName(
            post.authorUsername,
            post.authorDisplayName,
            post.authorId,
          );
          const initials = getAvatarInitials(
            post.authorDisplayName?.trim() || post.authorUsername?.trim() || listName,
            undefined,
          );
          const isMine = post.authorId === myUserId;
          return (
            <li
              key={post.id}
              className="rounded-xl border border-[#2a3344] bg-[#171c26]/90 px-2.5 py-2 shadow-[0_6px_20px_rgba(0,0,0,0.22)]"
            >
              <div className="flex min-w-0 gap-2">
                <ProfileAvatarBubble url={post.authorAvatarUrl} initials={initials} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                    <span className="truncate text-[0.8125rem] font-semibold text-[#e8ecf4]">{listName}</span>
                    <ShowWhen when={isMine}>
                      <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-[#6ee7b7]/80">You</span>
                    </ShowWhen>
                    <span className="text-[0.65rem] text-[#8b95a8]">{formatFeedTime(post.createdAt)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[0.75rem] leading-snug text-[#d1d7e3]">
                    {bodyWithLinks(post.body)}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div ref={sentinelRef} className="h-1 w-full shrink-0" aria-hidden />

      <ShowWhen when={loadingMore}>
        <p className="text-center text-[0.65rem] text-[#8b95a8]">Loading more…</p>
      </ShowWhen>
    </div>
  );
}
