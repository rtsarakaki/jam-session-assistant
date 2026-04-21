"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  addFriendFeedCommentAction,
  createFriendFeedPostAction,
  deleteFriendFeedCommentAction,
  deleteFriendFeedPostAction,
  listFriendFeedPostLikersAction,
  loadFriendFeedPageAction,
  shareFriendFeedPostToMyFeedAction,
  toggleFriendFeedPostLikeAction,
  updateFriendFeedPostAction,
} from "@/lib/actions/feed-actions";
import { FeedPostLinkPreview } from "./FeedPostLinkPreview";
import { FeedPostLinkedInActions } from "./FeedPostLinkedInActions";
import { FeedPostSendAppsDialog } from "./FeedPostSendAppsDialog";
import { ProfileAvatarBubble } from "@/components/avatar/ProfileAvatarBubble";
import { MintSlatePanelButton } from "@/components/buttons/MintSlatePanelButton";
import { ShowWhen } from "@/components/conditional";
import { getAvatarInitials } from "@/lib/auth/user-display";
import type { FriendFeedPostItem, FriendFeedPostLikerItem } from "@/lib/platform/feed-service";
import { formatProfileListName } from "@/lib/platform/friends-candidates";
import { renderBodyWithLinks } from "@/lib/feed/render-body-with-links";
import { extractFirstHttpUrl } from "@/lib/validation/feed-url";
import { FRIEND_FEED_COMMENT_BODY_MAX } from "@/lib/validation/friend-feed-comment-body";
import type { AppLocale } from "@/lib/i18n/locales";

function formatFeedTime(iso: string, locale: AppLocale): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return d.toLocaleString();
  }
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return locale === "pt" ? "agora" : "just now";
  if (mins < 60) return locale === "pt" ? `há ${mins} min` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return locale === "pt" ? `há ${hrs} h` : `${hrs}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Card header time — same pattern as activity cards (medium date + short time). */
function formatCardWhen(iso: string, locale: AppLocale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return locale === "pt" ? "Data desconhecida" : "Unknown date";
  return d.toLocaleString(locale === "pt" ? "pt-BR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type FeedPanelProps = {
  myUserId: string;
  initialItems: FriendFeedPostItem[];
  initialNextCursor: { createdAt: string; id: string } | null;
  locale: AppLocale;
};

export function FeedPanel({ myUserId, initialItems, initialNextCursor, locale }: FeedPanelProps) {
  const formId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const composerBodyRef = useRef<HTMLTextAreaElement>(null);
  const commentBodyRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
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
  /** Collapsed by default; expand to read/write comments. */
  const [commentsExpandedByPostId, setCommentsExpandedByPostId] = useState<Record<string, boolean>>({});
  const [togglingLikePostId, setTogglingLikePostId] = useState<string | null>(null);
  const likersDialogRef = useRef<HTMLDialogElement>(null);
  const [likersLoading, setLikersLoading] = useState(false);
  const [likersRows, setLikersRows] = useState<FriendFeedPostLikerItem[]>([]);
  const [sharingToFeedPostId, setSharingToFeedPostId] = useState<string | null>(null);
  const [sendAppsPost, setSendAppsPost] = useState<FriendFeedPostItem | null>(null);
  const [feedOkMessage, setFeedOkMessage] = useState<string | null>(null);
  const sendAppsDialogRef = useRef<HTMLDialogElement>(null);
  const feedOkClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const nextCursorRef = useRef(initialNextCursor);
  const loadBusyRef = useRef(false);

  useEffect(() => {
    nextCursorRef.current = nextCursor;
  }, [nextCursor]);

  useEffect(() => {
    if (!sendAppsPost) return;
    const el = sendAppsDialogRef.current;
    if (el && !el.open) {
      el.showModal();
    }
  }, [sendAppsPost]);

  useEffect(() => {
    if (!feedOkMessage) return;
    if (feedOkClearRef.current) {
      clearTimeout(feedOkClearRef.current);
    }
    feedOkClearRef.current = setTimeout(() => setFeedOkMessage(null), 3200);
    return () => {
      if (feedOkClearRef.current) {
        clearTimeout(feedOkClearRef.current);
      }
    };
  }, [feedOkMessage]);

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

  /** Deep links from notifications: `/app/feed#feed-post-{id}` */
  useEffect(() => {
    function scrollToHashedPost() {
      const m = /^#feed-post-([0-9a-f-]{36})$/i.exec(window.location.hash);
      if (!m) return;
      const postId = m[1];
      const el = document.getElementById(`feed-post-${postId}`);
      if (el) {
        requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "center" }));
      }
    }
    scrollToHashedPost();
    window.addEventListener("hashchange", scrollToHashedPost);
    return () => window.removeEventListener("hashchange", scrollToHashedPost);
  }, [items]);

  useEffect(() => {
    if (!postPendingDelete) return;
    const el = deleteDialogRef.current;
    if (el && !el.open) {
      el.showModal();
    }
  }, [postPendingDelete]);

  function focusComposerTextarea() {
    requestAnimationFrame(() => {
      composerBodyRef.current?.focus();
    });
  }

  function focusCommentBody(postId: string) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        commentBodyRefs.current[postId]?.focus();
      });
    });
  }

  function openComposer() {
    setEditingPost(null);
    setDraft("");
    setPostError(null);
    dialogRef.current?.showModal();
    focusComposerTextarea();
  }

  function openEdit(post: FriendFeedPostItem) {
    setEditingPost(post);
    setDraft(post.body);
    setPostError(null);
    dialogRef.current?.showModal();
    focusComposerTextarea();
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

  async function sharePostToMyFeed(postId: string) {
    setSharingToFeedPostId(postId);
    setListError(null);
    const res = await shareFriendFeedPostToMyFeedAction(postId);
    setSharingToFeedPostId(null);
    if (res.error) {
      setListError(res.error);
      return;
    }
    setFeedOkMessage(locale === "pt" ? "Post adicionado ao seu feed." : "Post added to your feed.");
    const page = await loadFriendFeedPageAction({ cursor: null });
    if (!page.error) {
      setItems(page.items ?? []);
      setNextCursor(page.nextCursor ?? null);
    }
  }

  function openSendApps(post: FriendFeedPostItem) {
    setSendAppsPost(post);
  }

  function closeLikersDialog() {
    likersDialogRef.current?.close();
  }

  async function openLikers(postId: string) {
    setLikersRows([]);
    setLikersLoading(true);
    setListError(null);
    likersDialogRef.current?.showModal();
    const res = await listFriendFeedPostLikersAction(postId);
    setLikersLoading(false);
    if (res.error) {
      setListError(res.error);
      setLikersRows([]);
      return;
    }
    setLikersRows(res.likers ?? []);
  }

  async function toggleLike(postId: string) {
    if (togglingLikePostId) return;
    setTogglingLikePostId(postId);
    setListError(null);
    const res = await toggleFriendFeedPostLikeAction(postId);
    setTogglingLikePostId(null);
    if (res.error) {
      setListError(res.error);
      return;
    }
    setItems((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, likedByMe: res.liked ?? p.likedByMe, likeCount: res.likeCount ?? p.likeCount }
          : p,
      ),
    );
  }

  async function submitComment(postId: string, e?: React.FormEvent) {
    e?.preventDefault();
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
    setCommentsExpandedByPostId((d) => ({ ...d, [postId]: true }));
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
    <div className="relative flex w-full min-w-0 max-w-full flex-col gap-3 overflow-x-hidden pb-2">
      <ShowWhen when={!!listError}>
        <p className="text-[0.7rem] text-[#fca5a5]" role="alert">
          {listError}
        </p>
      </ShowWhen>
      <ShowWhen when={!!feedOkMessage}>
        <p className="text-[0.7rem] text-[#86efac]" role="status">
          {feedOkMessage}
        </p>
      </ShowWhen>

      <ul className="m-0 grid w-full min-w-0 max-w-full list-none grid-cols-1 gap-4 p-0 lg:grid-cols-3">
        {items.length === 0 ? (
          <li className="col-span-full min-w-0">
            <p className="rounded-xl border border-dashed border-[#2a3344] bg-[#111722] px-3 py-6 text-center text-sm text-[#8b95a8]">
              {locale === "pt" ? "Nenhum post disponível no momento." : "No posts available right now."}
            </p>
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
          const commentCount = post.comments.length;
          const commentsExpanded = commentsExpandedByPostId[post.id] ?? false;
          return (
            <li id={`feed-post-${post.id}`} key={post.id} className="min-w-0">
              <article className="flex h-full min-w-0 flex-col overflow-x-hidden rounded-xl border border-[#2a3344] bg-[#111722] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-md border border-[#6ee7b7]/40 bg-[color-mix(in_srgb,#6ee7b7_10%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6ee7b7]">
                    {locale === "pt" ? "Post" : "Post"}
                  </span>
                  <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                    <ShowWhen when={isMine}>
                      <button
                        type="button"
                        onClick={() => openEdit(post)}
                        disabled={deletingId === post.id || posting || submittingCommentForPostId === post.id}
                        className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-[#8b95a8] hover:bg-[#1e2533] hover:text-[#e8ecf4] disabled:opacity-50"
                        title={locale === "pt" ? "Editar post" : "Edit post"}
                      >
                        {locale === "pt" ? "Editar" : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteConfirm(post)}
                        disabled={deletingId === post.id || posting || submittingCommentForPostId === post.id}
                        className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-[#fca5a5]/90 hover:bg-[color-mix(in_srgb,#f87171_12%,#1e2533)] hover:text-[#fca5a5] disabled:opacity-50"
                        title={locale === "pt" ? "Excluir post" : "Delete post"}
                      >
                        {deletingId === post.id ? "…" : locale === "pt" ? "Excluir" : "Delete"}
                      </button>
                    </ShowWhen>
                    <time className="text-[11px] text-[#8b95a8]" dateTime={post.createdAt}>
                      {formatCardWhen(post.createdAt, locale)}
                    </time>
                  </div>
                </div>
                <div className="mt-3 flex min-w-0 items-center gap-2">
                  <ProfileAvatarBubble
                    url={post.authorAvatarUrl}
                    initials={initials}
                    size="sm"
                    activitiesHref={post.canOpenActivitiesPage ? `/app/user/${post.authorId}` : undefined}
                    activitiesAriaLabel={
                      post.canOpenActivitiesPage
                        ? locale === "pt"
                          ? `Atividades de ${listName}`
                          : `Activities for ${listName}`
                        : undefined
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0">
                      <span className="min-w-0 truncate text-sm font-semibold text-[#e8ecf4]">{listName}</span>
                      <ShowWhen when={isMine}>
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#6ee7b7]/80">
                          {locale === "pt" ? "Você" : "You"}
                        </span>
                      </ShowWhen>
                    </div>
                    {post.authorUsername ? (
                      <p className="mt-0.5 truncate text-xs text-[#8b95a8]">@{post.authorUsername}</p>
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 min-h-0 max-w-full flex-1 whitespace-pre-wrap wrap-anywhere text-sm leading-snug text-[#e8ecf4]">
                  {renderBodyWithLinks(post.body)}
                </p>
                {previewUrl ? (
                  <div className="mt-3 w-full min-w-0 max-w-full overflow-x-hidden">
                    <FeedPostLinkPreview key={`${post.id}-${previewUrl}`} url={previewUrl} locale={locale} />
                  </div>
                ) : null}
                <div className="mt-3 max-w-full min-w-0 shrink-0 overflow-x-hidden border-t border-[#2a3344] pt-2">
                {post.likeCount > 0 ? (
                  <div className="border-b border-[#2a3344] px-1.5 py-1.5">
                    <button
                      type="button"
                      onClick={() => void openLikers(post.id)}
                      disabled={deletingId === post.id || submittingCommentForPostId === post.id}
                      className="flex max-w-full min-w-0 items-center gap-1.5 rounded-lg py-0.5 pl-0.5 pr-1.5 text-left transition-colors hover:bg-[#1a202c] disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={
                        locale === "pt"
                          ? `${post.likeCount > 99 ? "99+" : post.likeCount} curtidas. Ver quem curtiu.`
                          : `${post.likeCount > 99 ? "99+" : post.likeCount} likes. See who liked.`
                      }
                      title={locale === "pt" ? "Ver quem curtiu este post" : "See who liked this post"}
                    >
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6ee7b7] text-[#0f1218] shadow-sm ring-1 ring-[#171c26]"
                        aria-hidden
                      >
                        <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                        </svg>
                      </span>
                      <span className="min-w-0 text-[0.7rem] font-semibold tabular-nums text-[#b8c0d0]">
                        {post.likeCount > 99 ? "99+" : post.likeCount}
                      </span>
                    </button>
                  </div>
                ) : null}
                <FeedPostLinkedInActions
                  locale={locale}
                  commentCount={commentCount}
                  commentsOpen={commentsExpanded}
                  liked={post.likedByMe}
                  likeBusy={togglingLikePostId === post.id}
                  sharePosting={sharingToFeedPostId === post.id}
                  disabled={deletingId === post.id || submittingCommentForPostId === post.id}
                  onToggleLike={() => void toggleLike(post.id)}
                  onToggleComments={() => {
                    const willExpand = !commentsExpanded;
                    setCommentsExpandedByPostId((d) => ({
                      ...d,
                      [post.id]: !commentsExpanded,
                    }));
                    if (willExpand) focusCommentBody(post.id);
                  }}
                  onShareToMyFeed={() => void sharePostToMyFeed(post.id)}
                  onSend={() => openSendApps(post)}
                />
                {commentsExpanded ? (
                  <div className="max-w-full min-w-0 border-t border-[#2a3344] px-1.5 pb-2 pt-2">
                    {commentCount > 0 ? (
                      <ul className="m-0 mb-3 list-none space-y-2.5 p-0" aria-label={locale === "pt" ? "Comentários" : "Comments"}>
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
                              <ProfileAvatarBubble
                                url={c.authorAvatarUrl}
                                initials={cInitials}
                                size="sm"
                                activitiesHref={c.canOpenActivitiesPage ? `/app/user/${c.authorId}` : undefined}
                                activitiesAriaLabel={
                                  c.canOpenActivitiesPage
                                    ? locale === "pt"
                                      ? `Atividades de ${cName}`
                                      : `Activities for ${cName}`
                                    : undefined
                                }
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0">
                                  <span className="text-[0.7rem] font-semibold text-[#e8ecf4]">{cName}</span>
                                  <span className="text-[0.6rem] text-[#8b95a8]">{formatFeedTime(c.createdAt, locale)}</span>
                                  <ShowWhen when={isCommentMine}>
                                    <button
                                      type="button"
                                      onClick={() => void removeComment(c.id, post.id)}
                                      disabled={
                                        deletingCommentId === c.id || submittingCommentForPostId === post.id
                                      }
                                      className="rounded-md px-1 py-0.5 text-[0.6rem] font-semibold text-[#8b95a8] hover:bg-[#1e2533] hover:text-[#fca5a5] disabled:opacity-50"
                                      title={locale === "pt" ? "Remover comentário" : "Remove comment"}
                                    >
                                      {deletingCommentId === c.id ? "..." : locale === "pt" ? "Remover" : "Remove"}
                                    </button>
                                  </ShowWhen>
                                </div>
                                <p className="mt-0.5 max-w-full whitespace-pre-wrap wrap-anywhere text-[0.7rem] leading-snug text-[#c8cedd]">
                                  {renderBodyWithLinks(c.body)}
                                </p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                    <form onSubmit={(e) => void submitComment(post.id, e)} className="min-w-0 max-w-full">
                      <label htmlFor={`${formId}-comment-${post.id}`} className="sr-only">
                        {locale === "pt" ? "Adicionar comentário" : "Add comment"}
                      </label>
                      <div className="flex min-w-0 max-w-full items-end gap-1.5">
                        <textarea
                          ref={(el) => {
                            if (el) commentBodyRefs.current[post.id] = el;
                            else delete commentBodyRefs.current[post.id];
                          }}
                          id={`${formId}-comment-${post.id}`}
                          rows={1}
                          maxLength={FRIEND_FEED_COMMENT_BODY_MAX}
                          value={postCommentDraft[post.id] ?? ""}
                          onChange={(e) =>
                            setPostCommentDraft((d) => ({
                              ...d,
                              [post.id]: e.target.value,
                            }))
                          }
                          onInput={(e) => {
                            const el = e.currentTarget;
                            el.style.height = "0";
                            el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              void submitComment(post.id);
                            }
                          }}
                          placeholder={locale === "pt" ? "Adicione um comentário..." : "Add a comment..."}
                          disabled={submittingCommentForPostId === post.id || posting || deletingId === post.id}
                          className="box-border min-h-9 min-w-0 max-w-full flex-1 basis-0 resize-none rounded-3xl border border-[#2a3344] bg-[#0f1218] py-2 pl-2.5 pr-2.5 text-[0.75rem] leading-snug text-[#e8ecf4] placeholder:text-[#5c6678] focus:border-[#6ee7b7]/55 focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={
                            submittingCommentForPostId === post.id ||
                            posting ||
                            deletingId === post.id ||
                            !(postCommentDraft[post.id] ?? "").trim()
                          }
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,#6ee7b7_45%,#2a3344)] bg-[#6ee7b7] text-[#0f1218] shadow-sm transition-colors hover:bg-[#5eead4] disabled:cursor-not-allowed disabled:border-[#2a3344] disabled:bg-[#1e2533] disabled:text-[#5c6678]"
                          aria-label={
                            submittingCommentForPostId === post.id
                              ? locale === "pt"
                                ? "Enviando comentário..."
                                : "Sending comment..."
                              : locale === "pt"
                                ? "Enviar comentário"
                                : "Send comment"
                          }
                          title={locale === "pt" ? "Enviar comentário" : "Send comment"}
                        >
                          {submittingCommentForPostId === post.id ? (
                            <span className="text-lg leading-none" aria-hidden>
                              ...
                            </span>
                          ) : (
                            <svg
                              className="h-4 w-4 translate-x-px"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <p className="mt-1.5 text-right text-[0.58rem] text-[#5c6678]">
                        {locale === "pt" ? "Enter para publicar · Shift+Enter para nova linha" : "Enter to post · Shift+Enter new line"}
                      </p>
                    </form>
                  </div>
                ) : null}
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      <div ref={sentinelRef} className="h-1 w-full shrink-0" aria-hidden />

      <ShowWhen when={loadingMore}>
        <p className="text-center text-[0.65rem] text-[#8b95a8]">{locale === "pt" ? "Carregando mais..." : "Loading more..."}</p>
      </ShowWhen>

      <button
        type="button"
        onClick={openComposer}
        className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] z-55 flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-[color-mix(in_srgb,#6ee7b7_50%,#2a3344)] bg-[#6ee7b7] text-3xl font-light leading-none text-[#0f1218] shadow-[0_8px_28px_rgba(0,0,0,0.45)] transition-transform hover:scale-[1.04] active:scale-[0.98]"
        aria-label={locale === "pt" ? "Novo post" : "New post"}
        title={locale === "pt" ? "Novo post" : "New post"}
      >
        +
      </button>

      <dialog
        ref={dialogRef}
        onClose={resetComposerState}
        className="fixed left-1/2 top-1/2 w-[min(26rem,calc(100%-2rem))] max-h-[min(90dvh,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#2a3344] bg-[#171c26] p-0 text-[#e8ecf4] shadow-2xl open:flex open:flex-col backdrop:bg-black/60"
      >
        <form id={formId} onSubmit={onSubmit} className="flex min-h-0 min-w-0 flex-1 flex-col p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="m-0 text-sm font-semibold text-[#e8ecf4]">
              {editingPost ? (locale === "pt" ? "Editar post" : "Edit post") : locale === "pt" ? "Novo post" : "New post"}
            </h3>
            <button
              type="button"
              onClick={closeComposer}
              className="rounded-md px-2 py-1 text-[0.7rem] font-semibold text-[#8b95a8] hover:bg-[#1e2533] hover:text-[#e8ecf4]"
              aria-label={locale === "pt" ? "Fechar" : "Close"}
              title={locale === "pt" ? "Fechar" : "Close"}
            >
              ✕
            </button>
          </div>
          <label htmlFor={`${formId}-body`} className="sr-only">
            {locale === "pt" ? "Conteúdo do post" : "Post body"}
          </label>
          <textarea
            ref={composerBodyRef}
            id={`${formId}-body`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            maxLength={4000}
            placeholder={
              locale === "pt"
                ? "Show hoje, endereço, link do flyer, vídeo da apresentação..."
                : "Gig tonight, address, flyer link, performance video..."
            }
            className="mt-2 min-h-0 min-w-0 w-full max-w-full flex-1 resize-y rounded-lg border border-[#2a3344] bg-[#0f1218] px-2.5 py-2 text-[0.8125rem] leading-snug text-[#e8ecf4] placeholder:text-[#5c6678] focus:border-[#6ee7b7]/55 focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <MintSlatePanelButton type="submit" variant="mint" disabled={posting} className="w-auto min-w-28 px-4">
              {posting
                ? editingPost
                  ? locale === "pt"
                    ? "Salvando..."
                    : "Saving..."
                  : locale === "pt"
                    ? "Publicando..."
                    : "Posting..."
                : editingPost
                  ? locale === "pt"
                    ? "Salvar"
                    : "Save"
                  : locale === "pt"
                    ? "Publicar"
                    : "Post"}
            </MintSlatePanelButton>
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
        className="fixed left-1/2 top-1/2 w-[min(22rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#2a3344] bg-[#171c26] p-4 text-[#e8ecf4] shadow-2xl open:block backdrop:bg-black/60"
        aria-labelledby={`${formId}-delete-title`}
      >
        <h3 id={`${formId}-delete-title`} className="m-0 text-sm font-semibold text-[#e8ecf4]">
          {locale === "pt" ? "Excluir post?" : "Delete post?"}
        </h3>
        <p className="mt-2 mb-0 text-[0.75rem] leading-snug text-[#8b95a8]">
          {locale === "pt"
            ? "Essa ação não pode ser desfeita. O post será removido do feed."
            : "This cannot be undone. The post will be removed from the feed."}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <MintSlatePanelButton
            type="button"
            variant="slate"
            onClick={closeDeleteConfirm}
            className="sm:min-w-0 sm:flex-1 sm:max-w-32"
          >
            {locale === "pt" ? "Cancelar" : "Cancel"}
          </MintSlatePanelButton>
          <button
            type="button"
            onClick={() => void confirmDeletePost()}
            disabled={deletingId !== null}
            className="w-full rounded-lg border border-[color-mix(in_srgb,#f87171_45%,#2a3344)] bg-[color-mix(in_srgb,#f87171_14%,#1e2533)] py-2.5 text-sm font-semibold text-[#fca5a5] transition-colors hover:border-[#f87171]/55 hover:bg-[color-mix(in_srgb,#f87171_22%,#1e2533)] disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-0 sm:flex-1 sm:max-w-32"
          >
            {locale === "pt" ? "Excluir" : "Delete"}
          </button>
        </div>
      </dialog>

      <dialog
        ref={likersDialogRef}
        onClose={() => {
          setLikersRows([]);
          setLikersLoading(false);
        }}
        className="fixed left-1/2 top-1/2 max-h-[min(70dvh,28rem)] w-[min(22rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#2a3344] bg-[#171c26] p-0 text-[#e8ecf4] shadow-2xl open:flex open:flex-col backdrop:bg-black/60"
        aria-labelledby={`${formId}-likers-title`}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[#2a3344] px-3 py-2.5">
          <h3 id={`${formId}-likers-title`} className="m-0 text-sm font-semibold text-[#e8ecf4]">
            {locale === "pt" ? "Quem curtiu" : "Who liked this"}
          </h3>
          <button
            type="button"
            onClick={closeLikersDialog}
            className="rounded-md px-2 py-1 text-[0.7rem] font-semibold text-[#8b95a8] hover:bg-[#1e2533] hover:text-[#e8ecf4]"
            aria-label={locale === "pt" ? "Fechar" : "Close"}
            title={locale === "pt" ? "Fechar" : "Close"}
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {likersLoading ? (
            <p className="m-0 text-[0.7rem] text-[#8b95a8]">{locale === "pt" ? "Carregando..." : "Loading..."}</p>
          ) : likersRows.length === 0 ? (
            <p className="m-0 text-[0.7rem] text-[#8b95a8]">{locale === "pt" ? "Ainda sem curtidas." : "No likes yet."}</p>
          ) : (
            <ul className="m-0 list-none space-y-2.5 p-0" aria-label={locale === "pt" ? "Pessoas que curtiram este post" : "People who liked this post"}>
              {likersRows.map((row) => {
                const name = formatProfileListName(row.username, row.displayName, row.userId);
                const initials = getAvatarInitials(
                  row.displayName?.trim() || row.username?.trim() || name,
                  undefined,
                );
                return (
                  <li key={row.userId} className="flex min-w-0 items-center gap-2.5">
                    <ProfileAvatarBubble
                      url={row.avatarUrl}
                      initials={initials}
                      size="sm"
                      activitiesHref={row.canOpenActivitiesPage ? `/app/user/${row.userId}` : undefined}
                      activitiesAriaLabel={
                        row.canOpenActivitiesPage
                          ? locale === "pt"
                            ? `Atividades de ${name}`
                            : `Activities for ${name}`
                          : undefined
                      }
                    />
                    <span className="min-w-0 flex-1 truncate text-[0.75rem] font-semibold text-[#e8ecf4]">{name}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </dialog>

      <FeedPostSendAppsDialog
        dialogRef={sendAppsDialogRef}
        post={sendAppsPost}
        formIdPrefix={`${formId}-send-apps`}
        onClose={() => setSendAppsPost(null)}
      />
    </div>
  );
}
