"use client";

import Link from "next/link";
import { useRef } from "react";
import { FriendProfileDetailDialog } from "@/app/(private)/app/friends/FriendProfileDetailDialog";
import { ProfileAvatarBubble } from "@/components/avatar/ProfileAvatarBubble";
import { MintSlatePanelButton } from "@/components/buttons/MintSlatePanelButton";
import type { AppLocale } from "@/lib/i18n/locales";
import { getAvatarInitials } from "@/lib/auth/user-display";
import type { PublicProfileCard } from "@/lib/platform/friends-service";

function instrumentsLine(instruments: string[]): string {
  return instruments.length ? instruments.join(" · ") : "—";
}

type FriendCardProps = {
  card: PublicProfileCard;
  locale: AppLocale;
  isFollowing: boolean;
  /** True when you follow each other (can open `/app/user/[id]` from the avatar). */
  mutuallyFollowed: boolean;
  formAction: (payload: FormData) => void;
  pending: boolean;
};

export function FriendCard({ card, locale, isFollowing, mutuallyFollowed, formAction, pending }: FriendCardProps) {
  const pt = locale === "pt";
  const detailRef = useRef<HTMLDialogElement>(null);
  const initialsSource =
    (card.username?.trim() ? card.username : card.displayName?.trim() ? card.displayName : card.listName) ?? "?";
  const initials = getAvatarInitials(initialsSource.replace(/^@/, ""), undefined);
  const activitiesHref = mutuallyFollowed ? `/app/user/${card.id}` : undefined;
  const activitiesLabel = mutuallyFollowed
    ? pt
      ? `Atividades de ${card.listName}`
      : `Activities for ${card.listName}`
    : undefined;
  const openProfileLabel = pt ? `Ver perfil: ${card.listName}` : `View profile: ${card.listName}`;

  return (
    <article
      className="flex h-full min-h-52 w-full min-w-0 flex-col rounded-xl border border-[#2a3344] bg-[#171c26]/80 px-3 pb-4 pt-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      data-user-id={card.id}
    >
      <div className="flex min-h-0 w-full flex-1 flex-col items-center text-center">
        {mutuallyFollowed ? (
          <Link
            href={`/app/user/${card.id}`}
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#6ee7b7]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#171c26]"
            aria-label={activitiesLabel}
            title={activitiesLabel}
          >
            <ProfileAvatarBubble key={`${card.id}:${card.avatarUrl ?? ""}`} url={card.avatarUrl} initials={initials} size="lg" decorative />
          </Link>
        ) : (
          <button
            type="button"
            className="rounded-full border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-[#6ee7b7]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#171c26]"
            onClick={() => detailRef.current?.showModal()}
            aria-haspopup="dialog"
            aria-label={openProfileLabel}
          >
            <ProfileAvatarBubble key={`${card.id}:${card.avatarUrl ?? ""}`} url={card.avatarUrl} initials={initials} size="lg" decorative />
          </button>
        )}
        <button
          type="button"
          className="mt-3 w-full cursor-pointer border-0 bg-transparent p-0 text-center text-inherit outline-none focus-visible:ring-2 focus-visible:ring-[#6ee7b7]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#171c26]"
          onClick={() => detailRef.current?.showModal()}
          aria-haspopup="dialog"
          aria-label={openProfileLabel}
        >
          <h3 className="line-clamp-2 min-h-8 w-full text-xs font-semibold leading-snug tracking-tight text-[#e8ecf4]">
            {card.listName}
          </h3>
          <p className="mt-2 line-clamp-3 w-full text-xs leading-relaxed text-[#8b95a8]">{instrumentsLine(card.instruments)}</p>
        </button>
      </div>
      <form action={formAction} className="mt-5 w-full shrink-0">
        <input type="hidden" name="targetUserId" value={card.id} />
        <input type="hidden" name="intent" value={isFollowing ? "unfollow" : "follow"} />
        <MintSlatePanelButton
          type="submit"
          variant={isFollowing ? "mint" : "slate"}
          disabled={pending}
          aria-label={
            isFollowing
              ? pt
                ? `Deixar de seguir ${card.listName}`
                : `Unfollow ${card.listName}`
              : pt
                ? `Seguir ${card.listName}`
                : `Follow ${card.listName}`
          }
        >
          {isFollowing ? (pt ? "Deixar de seguir" : "Unfollow") : pt ? "Seguir" : "Follow"}
        </MintSlatePanelButton>
      </form>
      <FriendProfileDetailDialog
        card={card}
        locale={locale}
        dialogRef={detailRef}
        activitiesHref={activitiesHref}
        activitiesAriaLabel={activitiesLabel}
      />
    </article>
  );
}
