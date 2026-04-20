"use client";

import Link from "next/link";
import { startTransition, useEffect, useId, useRef, useState } from "react";
import {
  loadMyNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/actions/notifications-actions";
import type { AppNotificationItem } from "@/lib/platform";

function formatNotificationTime(iso: string): string {
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

type AppNotificationsBellProps = {
  initialItems: AppNotificationItem[];
  initialUnreadCount: number;
};

export function AppNotificationsBell({ initialItems, initialUnreadCount }: AppNotificationsBellProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotificationItem[]>(initialItems);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

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
        title="Notifications"
      >
        <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M9 17a3 3 0 0 0 6 0" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 min-w-[1rem] rounded-full bg-[#6ee7b7] px-1 py-[1px] text-[0.58rem] font-bold text-[#0f1218]">
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
            <p className="text-sm font-semibold text-[#e8ecf4]">Notifications</p>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={busy || unreadCount === 0}
              className="whitespace-nowrap rounded-md border border-[#2a3344] px-2 py-1 text-[0.65rem] font-semibold text-[#8b95a8] hover:text-[#e8ecf4] disabled:opacity-60"
            >
              Mark all read
            </button>
          </div>

          <div className="mt-2 max-h-80 min-w-0 overflow-auto pr-1">
            {loading ? (
              <p className="text-xs text-[#8b95a8]">Loading...</p>
            ) : items.length === 0 ? (
              <p className="text-xs text-[#8b95a8]">No notifications yet.</p>
            ) : (
              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={`rounded-lg border px-2.5 py-2 ${
                      item.readAt
                        ? "border-[#2a3344] bg-[#111722]/50"
                        : "border-[color-mix(in_srgb,#6ee7b7_40%,#2a3344)] bg-[color-mix(in_srgb,#6ee7b7_10%,#111722)]"
                    }`}
                  >
                    <Link
                      href={item.resourcePath ?? "/app/feed"}
                      onClick={() => {
                        void markOneRead(item.id);
                        setOpen(false);
                      }}
                      className="block min-w-0"
                    >
                      <p className="text-[0.72rem] font-semibold text-[#e8ecf4] [overflow-wrap:anywhere]">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-[0.68rem] text-[#b8c0d0] [overflow-wrap:anywhere]">{item.body}</p>
                      <p className="mt-1 text-[0.6rem] text-[#8b95a8]">{formatNotificationTime(item.createdAt)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
