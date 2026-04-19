"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";

const dockBtnClass =
  "mx-auto flex max-w-32 min-h-[3.25rem] flex-1 cursor-pointer flex-col items-center justify-center gap-[0.15rem] rounded-[10px] border-0 bg-transparent px-1.5 py-1 text-[0.625rem] font-semibold uppercase tracking-wide text-[#8b95a8] opacity-95 transition-[color,background] duration-150 md:min-h-0";

const dockBtnActiveClass =
  "text-[#6ee7b7] bg-[color-mix(in_srgb,#6ee7b7_12%,transparent)] opacity-100";

const iconClass =
  "h-[1.35rem] w-[1.35rem] shrink-0 opacity-90 md:h-[1.625rem] md:w-[1.625rem]";

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

function IconFriends() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
  label: string;
  title: string;
  Icon: () => ReactElement;
};

const items: DockItem[] = [
  { href: "/app/jam", label: "Jam", title: "Jam session", Icon: IconJam },
  { href: "/app/songs", label: "Songs", title: "Song catalog", Icon: IconSongs },
  { href: "/app/repertoire", label: "Rep", title: "Your repertoire", Icon: IconRep },
  { href: "/app/friends", label: "Friends", title: "Friends & network", Icon: IconFriends },
  { href: "/app/feed", label: "Feed", title: "Friend feed", Icon: IconFeed },
];

/** Bottom dock: links to each feature route; active state follows the URL. */
export function AppShellDock() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex w-full min-h-[calc(3.5rem+env(safe-area-inset-bottom,0px))] items-stretch justify-around gap-0 border-t border-[#2a3344] bg-[#171c26]/95 px-1 pb-[env(safe-area-inset-bottom,0px)] pt-[0.4rem] shadow-[0_-8px_24px_rgba(0,0,0,0.35)] backdrop-blur-[14px] [-webkit-backdrop-filter:blur(14px)]"
      aria-label="Main navigation"
    >
      {items.map((item) => {
        const current = pathname === item.href;
        const Icon = item.Icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${dockBtnClass} ${current ? dockBtnActiveClass : ""} hover:text-[#e8ecf4] hover:bg-[#1e2533] focus-visible:text-[#e8ecf4] focus-visible:bg-[#1e2533] focus-visible:outline-none ${current ? "[&_svg]:opacity-100" : ""}`}
            title={item.title}
            aria-current={current ? "page" : undefined}
          >
            <Icon />
            <span className="block max-w-[3.65rem] truncate leading-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
