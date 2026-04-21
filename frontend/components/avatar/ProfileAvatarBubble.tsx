"use client";

import Link from "next/link";
import { useState } from "react";

const ring =
  "shrink-0 overflow-hidden rounded-full border-2 border-[color-mix(in_srgb,#6ee7b7_35%,#2a3344)] bg-[#1e2533] text-[#6ee7b7]";

const sizes = {
  sm: {
    box: `flex ${ring} h-8 w-8 items-center justify-center`,
    text: "text-[0.65rem] font-bold leading-none",
    dim: 32,
  },
  lg: {
    box: `flex ${ring} h-18 w-18 items-center justify-center`,
    text: "text-lg font-semibold tracking-tight",
    dim: 72,
  },
  xl: {
    box: `flex ${ring} h-24 w-24 items-center justify-center`,
    text: "text-2xl font-semibold tracking-tight",
    dim: 96,
  },
} as const;

export type ProfileAvatarBubbleSize = keyof typeof sizes;

export type ProfileAvatarBubbleProps = {
  url: string | null;
  initials: string;
  size: ProfileAvatarBubbleSize;
  /** Decorative circle inside a labelled control (default true). */
  decorative?: boolean;
  className?: string;
  /** When set, the bubble links to this user's activities page (`/app/user/[id]`). */
  activitiesHref?: string | null;
  /** Accessible name for the activities link (recommended when `activitiesHref` is set). */
  activitiesAriaLabel?: string;
};

/** OAuth-style ring + photo or initials; used in shell header, friend cards, and profile dialog. */
export function ProfileAvatarBubble({
  url,
  initials,
  size,
  decorative = true,
  className,
  activitiesHref,
  activitiesAriaLabel,
}: ProfileAvatarBubbleProps) {
  const [broken, setBroken] = useState(false);
  const showImg = Boolean(url?.trim()) && !broken;
  const cfg = sizes[size];
  const dim = cfg.dim;
  const combined = className ? `${cfg.box} ${className}` : cfg.box;

  const inner = showImg ? (
    // eslint-disable-next-line @next/next/no-img-element -- HTTPS avatar URLs (OAuth / stored profile)
    <img
      src={url!.trim()}
      alt=""
      className="h-full w-full object-cover"
      width={dim}
      height={dim}
      onError={() => setBroken(true)}
    />
  ) : (
    <span className={cfg.text}>{initials}</span>
  );

  const href = activitiesHref?.trim();
  if (href) {
    return (
      <Link
        href={href}
        className={`${combined} cursor-pointer outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#6ee7b7]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#171c26]`}
        aria-label={activitiesAriaLabel ?? "User activities"}
        title={activitiesAriaLabel ?? undefined}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className={combined} aria-hidden={decorative ? true : undefined}>
      {inner}
    </div>
  );
}
