"use client";

import { useId } from "react";
import { ProfileAvatarBubble } from "@/components/avatar/ProfileAvatarBubble";
import { getAvatarInitials } from "@/lib/auth/user-display";
import type { PublicProfileCard } from "@/lib/platform/friends-service";

function instrumentsLine(instruments: string[]): string {
  return instruments.length ? instruments.join(" · ") : "—";
}

type FriendProfileDetailDialogProps = {
  card: PublicProfileCard;
  dialogRef: React.RefObject<HTMLDialogElement | null>;
};

export function FriendProfileDetailDialog({ card, dialogRef }: FriendProfileDetailDialogProps) {
  const headingId = useId();
  const handle = card.username?.trim() ? `@${card.username.trim().toLowerCase()}` : null;
  const initialsSource =
    (card.username?.trim() ? card.username : card.displayName?.trim() ? card.displayName : card.listName) ?? "?";
  const initials = getAvatarInitials(initialsSource.replace(/^@/, ""), undefined);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      className="fixed top-1/2 left-1/2 z-50 w-[min(24rem,calc(100%_-_1.5rem))] max-h-[min(90dvh,36rem)] max-w-full -translate-x-1/2 -translate-y-1/2 overflow-y-auto overflow-x-hidden rounded-xl border border-[#2a3344] bg-[#141820] p-5 text-[#e8ecf4] shadow-2xl backdrop:bg-black/55"
      onMouseDown={(e) => {
        if (e.target === dialogRef.current) {
          dialogRef.current?.close();
        }
      }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-[#2a3344] bg-[#1e2533] px-3 py-1.5 text-xs font-semibold text-[#e8ecf4] transition-colors hover:border-[#3d4a60] hover:bg-[#232b3a]"
            onClick={() => dialogRef.current?.close()}
          >
            Close
          </button>
        </div>

        <div className="flex flex-col items-center text-center">
          <ProfileAvatarBubble key={`${card.id}:${card.avatarUrl ?? ""}`} url={card.avatarUrl} initials={initials} size="xl" />

          <h2 id={headingId} className="mt-4 text-base font-semibold leading-snug tracking-tight text-[#e8ecf4]">
            {card.listName}
          </h2>
          {handle && card.displayName?.trim() ? (
            <p className="mt-1 text-sm text-[#8b95a8]">{card.displayName.trim()}</p>
          ) : null}

          <div className="mt-4 w-full border-t border-[#2a3344] pt-4 text-left">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#5c6678]">Instruments</p>
            <p className="mt-1 text-sm leading-relaxed text-[#b4bcc9]">{instrumentsLine(card.instruments)}</p>
          </div>

          {card.bio ? (
            <div className="mt-3 w-full border-t border-[#2a3344] pt-4 text-left">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#5c6678]">Bio</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#b4bcc9]">{card.bio}</p>
            </div>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
