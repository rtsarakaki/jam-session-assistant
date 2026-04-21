"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { startTransition, useEffect, useState, type ReactElement } from "react";
import type { AppLocale } from "@/lib/i18n/locales";

const dockBtnClass =
  "mx-auto flex max-w-32 min-h-[3.25rem] flex-1 cursor-pointer flex-col items-center justify-center gap-[0.15rem] rounded-[10px] border-0 bg-transparent px-1.5 py-1 text-[0.625rem] font-semibold uppercase tracking-wide text-[#8b95a8] opacity-95 transition-[color,background] duration-150 md:min-h-0";

const dockBtnActiveClass =
  "text-[#8b95a8] opacity-100 [&_svg]:text-[#6ee7b7] [&_svg]:opacity-100";

const iconClass =
  "h-[1.35rem] w-[1.35rem] shrink-0 opacity-90 md:h-6.5 md:w-6.5";

function IconJam() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function IconSongs() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function IconRep() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <line x1="6" y1="7" x2="18" y2="7" />
      <line x1="6" y1="10" x2="18" y2="10" />
      <line x1="6" y1="13" x2="18" y2="13" />
      <line x1="6" y1="16" x2="18" y2="16" />
      <path d="M14 7v6.5a2.5 2.5 0 1 1-1.5-2.3" />
      <path d="M14 8.5 18 7v5.5a2.5 2.5 0 1 1-1.5-2.3" />
    </svg>
  );
}

function IconEvents() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <circle cx="12" cy="15" r="2.5" />
    </svg>
  );
}

function IconFeed() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

type DockItem = {
  href: string;
  label: Record<AppLocale, string>;
  title: Record<AppLocale, string>;
  Icon: () => ReactElement;
};

const items: DockItem[] = [
  {
    href: "/app/songs",
    label: { en: "Songs", pt: "Músicas" },
    title: { en: "Song catalog", pt: "Catálogo de músicas" },
    Icon: IconSongs,
  },
  {
    href: "/app/repertoire",
    label: { en: "Rep", pt: "Rep" },
    title: { en: "Your repertoire", pt: "Seu repertório" },
    Icon: IconRep,
  },
  {
    href: "/app/jam",
    label: { en: "Jam", pt: "Jam" },
    title: { en: "Jam session", pt: "Sessão de jam" },
    Icon: IconJam,
  },
  {
    href: "/app/feed",
    label: { en: "Feed", pt: "Feed" },
    title: { en: "Friend feed", pt: "Feed de amigos" },
    Icon: IconFeed,
  },
  {
    href: "/app/events",
    label: { en: "Events", pt: "Eventos" },
    title: { en: "Upcoming events", pt: "Eventos próximos" },
    Icon: IconEvents,
  },
];

/** Bottom dock: links to each feature route; active state follows the URL. */
export function AppShellDock({ locale }: { locale: AppLocale }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingHref) return;
    if (pathname === pendingHref || pathname.startsWith(`${pendingHref}/`)) {
      startTransition(() => setPendingHref(null));
    }
  }, [pathname, pendingHref]);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex w-full min-h-[calc(3.5rem+env(safe-area-inset-bottom,0px))] items-stretch justify-around gap-0 border-t border-[#2a3344] bg-[#171c26]/95 px-1 pb-[env(safe-area-inset-bottom,0px)] pt-[0.4rem] shadow-[0_-8px_24px_rgba(0,0,0,0.35)] backdrop-blur-[14px] [-webkit-backdrop-filter:blur(14px)]"
      aria-label="Main navigation"
    >
      {items.map((item) => {
        const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const pending = pendingHref === item.href;
        const Icon = item.Icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => {
              if (!current) setPendingHref(item.href);
            }}
            className={`${dockBtnClass} ${current ? dockBtnActiveClass : ""} hover:text-[#e8ecf4] hover:bg-[#1e2533] focus-visible:text-[#e8ecf4] focus-visible:bg-[#1e2533] focus-visible:outline-none ${current ? "[&_svg]:opacity-100" : ""} ${pending ? "text-[#6ee7b7]" : ""}`}
            title={item.title[locale]}
            aria-current={current ? "page" : undefined}
            aria-busy={pending || undefined}
          >
            {pending ? (
              <span
                className="block h-[1.35rem] w-[1.35rem] animate-spin rounded-full border-2 border-[#6ee7b7]/35 border-t-[#6ee7b7] md:h-6 md:w-6"
                aria-hidden
              />
            ) : (
              <Icon />
            )}
            <span className="block max-w-[3.65rem] truncate leading-tight">{item.label[locale]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
