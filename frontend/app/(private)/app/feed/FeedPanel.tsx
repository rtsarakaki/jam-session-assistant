"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  addFriendFeedCommentAction,
  createFriendFeedPostAction,
  deleteFriendFeedCommentAction,
  deleteFriendFeedPostAction,
  loadFriendFeedPageAction,
  updateFriendFeedPostAction,
} from "@/lib/actions/feed-actions";
import { FeedPostLinkPreview } from "./FeedPostLinkPreview";
import { ProfileAvatarBubble } from "@/components/avatar/ProfileAvatarBubble";
import { MintSlatePanelButton } from "@/components/buttons/MintSlatePanelButton";
import { ShowWhen } from "@/components/conditional";
import { getAvatarInitials } from "@/lib/auth/user-display";
import type { FriendFeedPostItem } from "@/lib/platform/feed-service";
import { formatProfileListName } from "@/lib/platform/friends-candidates";
import { extractFirstHttpUrl } from "@/lib/validation/feed-url";
import { FRIEND_FEED_COMMENT_BODY_MAX } from "@/lib/validation/friend-feed-comment-body";

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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<FriendFeedPostItem[]>(initialItems);
  const [nextCursor, setNextCursor] = useState<{ createdAt: string; id: string } | null>(initialNextCursor);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<FriendFeedPostItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [postPendingDelete, setPostPendingDelete] = useState<FriendFeedPostItem | null>(null);
  const [postCommentDraft, setPostCommentDraft] = useState<Record<string, string>>({});
  const [submittingCommentForPostId, setSubmittingCommentForPostId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
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

  useEffect(() => {
    if (!postPendingDelete) return;
    const el = deleteDialogRef.current;
    if (el && !el.open) {
      el.showModal();
    }
  }, [postPendingDelete]);

  function openComposer() {
    setEditingPost(null);
    setDraft("");
    setPostError(null);
    dialogRef.current?.showModal();
  }

  function openEdit(post: FriendFeedPostItem) {
    setEditingPost(post);
    setDraft(post.body);
    setPostError(null);
    dialogRef.current?.showModal();
  }

  function closeComposer() {
    dialogRef.current?.close();
  }

  function resetComposerState() {
    setPostError(null);
    setEditingPost(null);
    setDraft("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (posting) return;
    setPosting(true);
    setPostError(null);
    const res = editingPost
      ? await updateFriendFeedPostAction({ postId: editingPost.id, rawBody: draft })
      : await createFriendFeedPostAction(draft);
    setPosting(false);
    if (res.error) {
      setPostError(res.error);
      return;
    }
    closeComposer();
    const page = await loadFriendFeedPageAction({ cursor: null });
    if (page.error) {
      setPostError(page.error);
      return;
    }
    setItems(page.items ?? []);
    setNextCursor(page.nextCursor ?? null);
  }

  function openDeleteConfirm(post: FriendFeedPostItem) {
    setPostPendingDelete(post);
  }

  function closeDeleteConfirm() {
    deleteDialogRef.current?.close();
  }

  async function confirmDeletePost() {
    const post = postPendingDelete;
    if (!post) return;
    closeDeleteConfirm();
    setDeletingId(post.id);
    setListError(null);
    const res = await deleteFriendFeedPostAction(post.id);
    setDeletingId(null);
    if (res.error) {
      setListError(res.error);
      return;
    }
    setItems((prev) => prev.filter((p) => p.id !== post.id));
  }

  async function submitComment(e: React.FormEvent, postId: string) {
    e.preventDefault();
    if (submittingCommentForPostId) return;
    const raw = postCommentDraft[postId] ?? "";
    if (!raw.trim()) return;
    setSubmittingCommentForPostId(postId);
    setListError(null);
    const res = await addFriendFeedCommentAction({ postId, rawBody: raw });
    setSubmittingCommentForPostId(null);
    if (res.error) {
      setListError(res.error);
      return;
    }
    setPostCommentDraft((d) => ({ ...d, [postId]: "" }));
    setItems((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, comments: res.comments ?? p.comments } : p)),
    );
  }

  async function removeComment(commentId: string, postId: string) {
    setDeletingCommentId(commentId);
    setListError(null);
    const res = await deleteFriendFeedCommentAction(commentId);
    setDeletingCommentId(null);
    if (res.error) {
      setListError(res.error);
      return;
    }
    setItems((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) } : p,
      ),
    );
  }

  return (
    <div className="relative flex min-w-0 max-w-full flex-col gap-3 overflow-x-hidden pb-2">
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
          const previewUrl = extractFirstHttpUrl(post.body);
          return (
            <li
              key={post.id}
              className="min-w-0 max-w-full overflow-x-hidden rounded-xl border border-[#2a3344] bg-[#171c26]/90 py-2 shadow-[0_6px_20px_rgba(0,0,0,0.22)]"
            >
              <div className="flex min-w-0 gap-2 px-2.5">
                <ProfileAvatarBubble url={post.authorAvatarUrl} initials={initials} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0">
                      <span className="truncate text-[0.8125rem] font-semibold text-[#e8ecf4]">{listName}</span>
                      <ShowWhen when={isMine}>
                        <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-[#6ee7b7]/80">You</span>
                      </ShowWhen>
                      <span className="text-[0.65rem] text-[#8b95a8]">{formatFeedTime(post.createdAt)}</span>
                    </div>
                    <ShowWhen when={isMine}>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(post)}
                          disabled={deletingId === post.id || posting || submittingCommentForPostId === post.id}
                          className="rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold text-[#8b95a8] hover:bg-[#1e2533] hover:text-[#e8ecf4] disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteConfirm(post)}
                          disabled={deletingId === post.id || posting || submittingCommentForPostId === post.id}
                          className="rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold text-[#fca5a5]/90 hover:bg-[color-mix(in_srgb,#f87171_12%,#1e2533)] hover:text-[#fca5a5] disabled:opacity-50"
                        >
                          {deletingId === post.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </ShowWhen>
                  </div>
                  <p className="mt-1 max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[0.75rem] leading-snug text-[#d1d7e3]">
                    {bodyWithLinks(post.body)}
                  </p>
                </div>
              </div>
              {previewUrl ? (
                <div className="mt-3 flex w-full justify-center px-0">
                  <div className="w-full min-w-0 max-w-[min(100%,64rem)]">
                    <FeedPostLinkPreview key={`${post.id}-${previewUrl}`} url={previewUrl} />
                  </div>
                </div>
              ) : null}
              <div className="mt-3 border-t border-[#2a3344] px-2.5 pb-2 pt-2">
                {post.comments.length > 0 ? (
                  <ul className="m-0 mb-2.5 list-none space-y-2.5 p-0" aria-label="Comments">
                    {post.comments.map((c) => {
                      const cName = formatProfileListName(
                        c.authorUsername,
                        c.authorDisplayName,
                        c.authorId,
                      );
                      const cInitials = getAvatarInitials(
                        c.authorDisplayName?.trim() || c.authorUsername?.trim() || cName,
                        undefined,
                      );
                      const isCommentMine = c.authorId === myUserId;
                      return (
                        <li key={c.id} className="flex min-w-0 gap-2 text-left">
                          <ProfileAvatarBubble url={c.authorAvatarUrl} initials={cInitials} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0">
                              <span className="text-[0.7rem] font-semibold text-[#e8ecf4]">{cName}</span>
                              <span className="text-[0.6rem] text-[#8b95a8]">{formatFeedTime(c.createdAt)}</span>
                              <ShowWhen when={isCommentMine}>
                                <button
                                  type="button"
                                  onClick={() => void removeComment(c.id, post.id)}
                                  disabled={deletingCommentId === c.id || submittingCommentForPostId === post.id}
                                  className="rounded-md px-1 py-0.5 text-[0.6rem] font-semibold text-[#8b95a8] hover:bg-[#1e2533] hover:text-[#fca5a5] disabled:opacity-50"
                                >
                                  {deletingCommentId === c.id ? "…" : "Remove"}
                                </button>
                              </ShowWhen>
                            </div>
                            <p className="mt-0.5 max-w-full whitespace-pre-wrap break-words text-[0.7rem] leading-snug text-[#c8cedd] [overflow-wrap:anywhere]">
                              {bodyWithLinks(c.body)}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                <form
                  className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end"
                  onSubmit={(e) => void submitComment(e, post.id)}
                >
                  <label htmlFor={`${formId}-comment-${post.id}`} className="sr-only">
                    Comment on this post
                  </label>
                  <textarea
                    id={`${formId}-comment-${post.id}`}
                    rows={2}
                    maxLength={FRIEND_FEED_COMMENT_BODY_MAX}
                    value={postCommentDraft[post.id] ?? ""}
                    onChange={(e) =>
                      setPostCommentDraft((d) => ({
                        ...d,
                        [post.id]: e.target.value,
                      }))
                    }
                    placeholder="Write a comment…"
                    disabled={submittingCommentForPostId === post.id || posting || deletingId === post.id}
                    className="min-w-0 flex-1 resize-y rounded-lg border border-[#2a3344] bg-[#0f1218] px-2 py-1.5 text-[0.75rem] leading-snug text-[#e8ecf4] placeholder:text-[#5c6678] focus:border-[#6ee7b7]/55 focus:outline-none"
                  />
                  <MintSlatePanelButton
                    type="submit"
                    variant="mint"
                    disabled={submittingCommentForPostId === post.id || posting || deletingId === post.id}
                    className="w-full shrink-0 sm:w-auto sm:min-w-28 sm:px-4"
                  >
                    {submittingCommentForPostId === post.id ? "Sending…" : "Comment"}
                  </MintSlatePanelButton>
                </form>
              </div>
            </li>
          );
        })}
      </ul>

      <div ref={sentinelRef} className="h-1 w-full shrink-0" aria-hidden />

      <ShowWhen when={loadingMore}>
        <p className="text-center text-[0.65rem] text-[#8b95a8]">Loading more…</p>
      </ShowWhen>

      <button
        type="button"
        onClick={openComposer}
        className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] z-[55] flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-[color-mix(in_srgb,#6ee7b7_50%,#2a3344)] bg-[#6ee7b7] text-3xl font-light leading-none text-[#0f1218] shadow-[0_8px_28px_rgba(0,0,0,0.45)] transition-transform hover:scale-[1.04] active:scale-[0.98]"
        aria-label="New post"
        title="New post"
      >
        +
      </button>

      <dialog
        ref={dialogRef}
        onClose={resetComposerState}
        className="fixed left-1/2 top-1/2 w-[min(26rem,calc(100%_-_2rem))] max-h-[min(90dvh,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#2a3344] bg-[#171c26] p-0 text-[#e8ecf4] shadow-2xl open:flex open:flex-col [&::backdrop]:bg-black/60"
      >
        <form id={formId} onSubmit={onSubmit} className="flex min-h-0 min-w-0 flex-1 flex-col p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="m-0 text-sm font-semibold text-[#e8ecf4]">{editingPost ? "Edit post" : "New post"}</h3>
            <button
              type="button"
              onClick={closeComposer}
              className="rounded-md px-2 py-1 text-[0.7rem] font-semibold text-[#8b95a8] hover:bg-[#1e2533] hover:text-[#e8ecf4]"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <label htmlFor={`${formId}-body`} className="sr-only">
            Post body
          </label>
          <textarea
            id={`${formId}-body`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            maxLength={4000}
            placeholder="Gig tonight, address, flyer link, performance video…"
            className="mt-2 min-h-0 min-w-0 w-full max-w-full flex-1 resize-y rounded-lg border border-[#2a3344] bg-[#0f1218] px-2.5 py-2 text-[0.8125rem] leading-snug text-[#e8ecf4] placeholder:text-[#5c6678] focus:border-[#6ee7b7]/55 focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <MintSlatePanelButton type="submit" variant="mint" disabled={posting} className="w-auto min-w-28 px-4">
              {posting ? (editingPost ? "Saving…" : "Posting…") : editingPost ? "Save" : "Post"}
            </MintSlatePanelButton>
            <Link
              href="/app/friends"
              className="text-[0.7rem] font-medium text-[#6ee7b7]/90 underline-offset-2 hover:underline"
              onClick={() => closeComposer()}
            >
              Mutual friends
            </Link>
          </div>
          <ShowWhen when={!!postError}>
            <p className="mt-2 text-[0.7rem] text-[#fca5a5]" role="alert">
              {postError}
            </p>
          </ShowWhen>
        </form>
      </dialog>

      <dialog
        ref={deleteDialogRef}
        onClose={() => setPostPendingDelete(null)}
        className="fixed left-1/2 top-1/2 w-[min(22rem,calc(100%_-_2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#2a3344] bg-[#171c26] p-4 text-[#e8ecf4] shadow-2xl open:block [&::backdrop]:bg-black/60"
        aria-labelledby={`${formId}-delete-title`}
      >
        <h3 id={`${formId}-delete-title`} className="m-0 text-sm font-semibold text-[#e8ecf4]">
          Excluir publicação?
        </h3>
        <p className="mt-2 mb-0 text-[0.75rem] leading-snug text-[#8b95a8]">
          Esta ação não pode ser desfeita. O post será removido do feed.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <MintSlatePanelButton
            type="button"
            variant="slate"
            onClick={closeDeleteConfirm}
            className="sm:min-w-0 sm:flex-1 sm:max-w-[8rem]"
          >
            Cancelar
          </MintSlatePanelButton>
          <button
            type="button"
            onClick={() => void confirmDeletePost()}
            disabled={deletingId !== null}
            className="w-full rounded-lg border border-[color-mix(in_srgb,#f87171_45%,#2a3344)] bg-[color-mix(in_srgb,#f87171_14%,#1e2533)] py-2.5 text-sm font-semibold text-[#fca5a5] transition-colors hover:border-[#f87171]/55 hover:bg-[color-mix(in_srgb,#f87171_22%,#1e2533)] disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-0 sm:flex-1 sm:max-w-[8rem]"
          >
            Excluir
          </button>
        </div>
      </dialog>
    </div>
  );
}
