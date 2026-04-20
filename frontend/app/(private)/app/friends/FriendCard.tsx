"use client";

import { useRef } from "react";
import { FriendProfileDetailDialog } from "@/app/(private)/app/friends/FriendProfileDetailDialog";
import { ProfileAvatarBubble } from "@/components/avatar/ProfileAvatarBubble";
import { MintSlatePanelButton } from "@/components/buttons/MintSlatePanelButton";
import { getAvatarInitials } from "@/lib/auth/user-display";
import type { PublicProfileCard } from "@/lib/platform/friends-service";

function instrumentsLine(instruments: string[]): string {
  return instruments.length ? instruments.join(" · ") : "—";
}

type FriendCardProps = {
  card: PublicProfileCard;
  isFollowing: boolean;
  formAction: (payload: FormData) => void;
  pending: boolean;
};

export function FriendCard({ card, isFollowing, formAction, pending }: FriendCardProps) {
  const detailRef = useRef<HTMLDialogElement>(null);
  const initialsSource =
    (card.username?.trim() ? card.username : card.displayName?.trim() ? card.displayName : card.listName) ?? "?";
  const initials = getAvatarInitials(initialsSource.replace(/^@/, ""), undefined);

  return (
    <article
      className="flex h-full min-h-52 w-full min-w-0 flex-col rounded-xl border border-[#2a3344] bg-[#171c26]/80 px-3 pb-4 pt-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      data-user-id={card.id}
    >
      <button
        type="button"
        className="flex min-h-0 w-full flex-1 cursor-pointer flex-col items-center rounded-lg border-0 bg-transparent p-0 text-center text-inherit outline-none focus-visible:ring-2 focus-visible:ring-[#6ee7b7]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#171c26]"
        onClick={() => detailRef.current?.showModal()}
        aria-haspopup="dialog"
        aria-label={`Ver perfil: ${card.listName}`}
      >
        <ProfileAvatarBubble key={`${card.id}:${card.avatarUrl ?? ""}`} url={card.avatarUrl} initials={initials} size="lg" />
        <h3 className="mt-3 line-clamp-2 min-h-8 w-full text-xs font-semibold leading-snug tracking-tight text-[#e8ecf4]">
          {card.listName}
        </h3>
        <p className="mt-2 line-clamp-3 w-full text-xs leading-relaxed text-[#8b95a8]">{instrumentsLine(card.instruments)}</p>
      </button>
      <form action={formAction} className="mt-5 w-full shrink-0">
        <input type="hidden" name="targetUserId" value={card.id} />
        <input type="hidden" name="intent" value={isFollowing ? "unfollow" : "follow"} />
        <MintSlatePanelButton
          type="submit"
          variant={isFollowing ? "mint" : "slate"}
          disabled={pending}
          aria-label={isFollowing ? `Deixar de seguir ${card.listName}` : `Seguir ${card.listName}`}
        >
          {isFollowing ? "Deixar de seguir" : "Seguir"}
        </MintSlatePanelButton>
      </form>
      <FriendProfileDetailDialog card={card} dialogRef={detailRef} />
    </article>
  );
}
