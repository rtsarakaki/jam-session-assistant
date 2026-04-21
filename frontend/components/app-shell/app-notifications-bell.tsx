"use client";

import Link from "next/link";
import { startTransition, useEffect, useId, useRef, useState } from "react";
import { ProfileAvatarBubble } from "@/components/avatar/ProfileAvatarBubble";
import {
  loadMyNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/actions/notifications-actions";
import { getAvatarInitials } from "@/lib/auth/user-display";
import type { AppLocale } from "@/lib/i18n/locales";
import type { AppNotificationItem } from "@/lib/platform";

const SONG_UUID_RE = /^[0-9a-f-]{36}$/i;

const notifChipClass =
  "inline-flex min-h-7 items-center justify-center rounded-md border border-[#2a3344] bg-[#111722] px-2 py-0.5 text-[0.62rem] font-semibold text-[#b8c0d0] hover:border-[color-mix(in_srgb,#6ee7b7_45%,#2a3344)] hover:text-[#e8ecf4]";

function readSongCreatedMeta(meta: Record<string, unknown>): {
  songId: string;
  lyricsUrl: string | null;
  listenUrl: string | null;
  songTitle: string;
  songArtist: string;
} | null {
  const songId = meta.songId;
  if (typeof songId !== "string" || !SONG_UUID_RE.test(songId)) return null;
  const lyricsRaw = meta.lyricsUrl;
  const listenRaw = meta.listenUrl;
  const lyricsUrl =
    typeof lyricsRaw === "string" && /^https?:\/\//i.test(lyricsRaw.trim()) ? lyricsRaw.trim() : null;
  const listenUrl =
    typeof listenRaw === "string" && /^https?:\/\//i.test(listenRaw.trim()) ? listenRaw.trim() : null;
  const songTitle = typeof meta.songTitle === "string" ? meta.songTitle.trim() : "";
  const songArtist = typeof meta.songArtist === "string" ? meta.songArtist.trim() : "";
  return { songId, lyricsUrl, listenUrl, songTitle, songArtist };
}

function songCatalogNotificationDetail(meta: { songTitle: string; songArtist: string }, locale: AppLocale): string {
  const pt = locale === "pt";
  const title = meta.songTitle || "—";
  const artist = meta.songArtist || "—";
  return pt ? `Adicionou «${title}» — ${artist}.` : `Added "${title}" — ${artist}.`;
}

function dateLocaleTag(locale: AppLocale): string {
  return locale === "pt" ? "pt-PT" : "en-GB";
}

function formatNotificationTime(iso: string, locale: AppLocale): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const pt = locale === "pt";
  const tag = dateLocaleTag(locale);
  if (!Number.isFinite(diffMs) || diffMs < 0) return d.toLocaleString(tag);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return pt ? "agora" : "just now";
  if (mins < 60) return pt ? `há ${mins} min` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return pt ? `há ${hrs} h` : `${hrs}h ago`;
  return d.toLocaleDateString(tag, { month: "short", day: "numeric" });
}

function initialsFromActorLabel(actorLabel: string): string {
  const t = actorLabel.trim();
  if (!t) return "?";
  const stripped = t.startsWith("@") ? t.slice(1) : t;
  return getAvatarInitials(stripped, undefined);
}

function notificationHref(item: AppNotificationItem): string {
  const p = item.resourcePath?.trim();
  if (p) return p;
  if (item.type === "follow") return `/app/user/${item.actorId}`;
  if (item.type === "jam_created") return "/app/jam";
  if (item.type === "song_created") {
    const sm = readSongCreatedMeta(item.metadata);
    return sm ? `/app/songs#song-${sm.songId}` : "/app/songs";
  }
  return "/app/feed";
}

/** Second line: action text without repeating the actor name (shown on line 1). */
function notificationActionLine(item: AppNotificationItem, locale: AppLocale): string {
  const pt = locale === "pt";
  switch (item.type) {
    case "like":
      return pt ? "Curtiu a tua publicação no feed." : "Liked your feed post.";
    case "comment":
      return pt ? "Comentou a tua publicação no feed." : "Commented on your feed post.";
    case "follow":
      return pt ? "Começou a seguir-te." : "Started following you.";
    case "share":
      return pt ? "Partilhou uma das tuas publicações." : "Shared one of your feed posts.";
    case "jam_created": {
      const jamTitle = item.metadata?.jamTitle;
      if (typeof jamTitle === "string" && jamTitle.trim()) {
        const t = jamTitle.trim();
        return pt ? `Criou a jam «${t}».` : `Created jam "${t}".`;
      }
      return item.body;
    }
    case "song_created":
      return pt ? "Adicionou uma música ao catálogo." : "Added a song to the catalog.";
    default:
      return item.body || item.title;
  }
}

type AppNotificationsBellProps = {
  initialItems: AppNotificationItem[];
  initialUnreadCount: number;
  locale: AppLocale;
};

export function AppNotificationsBell({ initialItems, initialUnreadCount, locale }: AppNotificationsBellProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotificationItem[]>(initialItems);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const pt = locale === "pt";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await loadMyNotificationsAction(30);
      if (cancelled || result.error) return;
      setItems(result.items ?? []);
      setUnreadCount(result.unreadCount ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    startTransition(() => setLoading(true));
    void (async () => {
      const result = await loadMyNotificationsAction(30);
      if (cancelled) return;
      if (!result.error) {
        setItems(result.items ?? []);
        setUnreadCount(result.unreadCount ?? 0);
      }
      setLoading(false);
    })();

    function onPointerDown(e: PointerEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markOneRead(notificationId: string) {
    const target = items.find((i) => i.id === notificationId);
    if (!target || target.readAt) return;
    const result = await markNotificationReadAction(notificationId);
    if (result.error) return;
    setItems((prev) =>
      prev.map((item) => (item.id === notificationId ? { ...item, readAt: new Date().toISOString() } : item)),
    );
    setUnreadCount((n) => Math.max(0, n - 1));
  }

  async function markAllRead() {
    if (busy || unreadCount === 0) return;
    setBusy(true);
    const result = await markAllNotificationsReadAction();
    setBusy(false);
    if (result.error) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((item) => (item.readAt ? item : { ...item, readAt: now })));
    setUnreadCount(0);
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#2a3344] bg-[#171c26] text-[#d5dbe8] hover:border-[#6ee7b7]/55 hover:text-[#ffffff]"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        title={pt ? "Notificações" : "Notifications"}
      >
        <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M9 17a3 3 0 0 0 6 0" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-[#6ee7b7] px-1 py-px text-[0.58rem] font-bold text-[#0f1218]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-80 mt-1.5 w-[min(18rem,calc(100dvw-1.25rem))] max-w-[calc(100dvw-1.25rem)] sm:w-[min(19rem,calc(100dvw-1.5rem))] md:w-[min(20rem,calc(100dvw-2rem))] rounded-xl border border-[#2a3344] bg-[#171c26] p-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[#e8ecf4]">{pt ? "Notificações" : "Notifications"}</p>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={busy || unreadCount === 0}
              className="whitespace-nowrap rounded-md border border-[#2a3344] px-2 py-1 text-[0.65rem] font-semibold text-[#8b95a8] hover:text-[#e8ecf4] disabled:opacity-60"
            >
              {pt ? "Marcar lidas" : "Mark all read"}
            </button>
          </div>

          <div className="mt-2 max-h-80 min-w-0 overflow-auto pr-1">
            {loading ? (
              <p className="text-xs text-[#8b95a8]">{pt ? "A carregar…" : "Loading…"}</p>
            ) : items.length === 0 ? (
              <p className="text-xs text-[#8b95a8]">{pt ? "Ainda sem notificações." : "No notifications yet."}</p>
            ) : (
              <ul className="space-y-2">
                {items.map((item) => {
                  const songMeta = item.type === "song_created" ? readSongCreatedMeta(item.metadata) : null;
                  const href = notificationHref(item);
                  const actionLine = notificationActionLine(item, locale);
                  const songDetailLine =
                    songMeta && (songMeta.songTitle || songMeta.songArtist)
                      ? songCatalogNotificationDetail(songMeta, locale)
                      : actionLine;
                  const linkLabel = `${item.actorLabel}. ${songMeta ? songDetailLine : actionLine}`;
                  const liClass = `rounded-lg border px-2.5 py-2 ${
                    item.readAt
                      ? "border-[#2a3344] bg-[#111722]/50"
                      : "border-[color-mix(in_srgb,#6ee7b7_40%,#2a3344)] bg-[color-mix(in_srgb,#6ee7b7_10%,#111722)]"
                  }`;
                  const onMarkReadClose = () => {
                    void markOneRead(item.id);
                    setOpen(false);
                  };

                  return (
                    <li key={item.id} className={liClass}>
                      {songMeta ? (
                        <div className="flex min-w-0 gap-2.5">
                          <ProfileAvatarBubble
                            url={item.actorAvatarUrl}
                            initials={initialsFromActorLabel(item.actorLabel)}
                            size="sm"
                            decorative
                            className="shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[0.72rem] font-semibold leading-snug text-[#e8ecf4] wrap-anywhere">
                              {item.actorLabel}
                            </p>
                            <p className="mt-0.5 text-[0.68rem] leading-snug text-[#b8c0d0] wrap-anywhere">{songDetailLine}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <Link
                                href={`/app/songs#song-${songMeta.songId}`}
                                onClick={onMarkReadClose}
                                className={notifChipClass}
                              >
                                {pt ? "Música" : "Song"}
                              </Link>
                              {songMeta.lyricsUrl ? (
                                <a
                                  href={songMeta.lyricsUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={onMarkReadClose}
                                  className={notifChipClass}
                                >
                                  {pt ? "Letra" : "Lyrics"}
                                </a>
                              ) : null}
                              {songMeta.listenUrl ? (
                                <a
                                  href={songMeta.listenUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={onMarkReadClose}
                                  className={notifChipClass}
                                >
                                  {pt ? "Ouvir" : "Listen"}
                                </a>
                              ) : null}
                              <Link href={`/app/repertoire?addSong=${songMeta.songId}`} onClick={onMarkReadClose} className={notifChipClass}>
                                {pt ? "Repertório" : "Repertoire"}
                              </Link>
                            </div>
                            <p className="mt-1 text-[0.6rem] text-[#8b95a8]">{formatNotificationTime(item.createdAt, locale)}</p>
                          </div>
                        </div>
                      ) : (
                        <Link href={href} onClick={onMarkReadClose} className="flex min-w-0 gap-2.5" aria-label={linkLabel}>
                          <ProfileAvatarBubble
                            url={item.actorAvatarUrl}
                            initials={initialsFromActorLabel(item.actorLabel)}
                            size="sm"
                            decorative
                            className="shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[0.72rem] font-semibold leading-snug text-[#e8ecf4] wrap-anywhere">
                              {item.actorLabel}
                            </p>
                            <p className="mt-0.5 text-[0.68rem] leading-snug text-[#b8c0d0] wrap-anywhere">{actionLine}</p>
                            <p className="mt-1 text-[0.6rem] text-[#8b95a8]">{formatNotificationTime(item.createdAt, locale)}</p>
                          </div>
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
