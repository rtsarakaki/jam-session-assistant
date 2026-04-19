"use client";

import type { RefObject } from "react";
import { MintSlatePanelButton } from "@/components/buttons/MintSlatePanelButton";
import type { FriendFeedPostItem } from "@/lib/platform/feed-service";
import { formatProfileListName } from "@/lib/platform/friends-candidates";

type FeedPostSendAppsDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  post: FriendFeedPostItem | null;
  formIdPrefix: string;
  onClose: () => void;
};

function sharePayload(post: FriendFeedPostItem, origin: string) {
  const url = `${origin}/app/feed#post-${post.id}`;
  const listName = formatProfileListName(post.authorUsername, post.authorDisplayName, post.authorId);
  const textBody = `${listName} — Jam Session\n\n${post.body.slice(0, 500)}${post.body.length > 500 ? "…" : ""}`;
  const fullShare = `${textBody}\n\n${url}`;
  return { url, listName, textBody, fullShare };
}

/** Diálogo com destinos de partilha (WhatsApp, Telegram, e-mail, etc.) + menu nativo quando existir. */
export function FeedPostSendAppsDialog({ dialogRef, post, formIdPrefix, onClose }: FeedPostSendAppsDialogProps) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const appLinks = post ? buildAppLinks(post, origin) : null;

  async function tryNativeShare() {
    if (!post || !canNativeShare) return;
    const { url, textBody } = sharePayload(post, origin);
    try {
      await navigator.share({ title: "Jam Session", text: textBody, url });
      dialogRef.current?.close();
    } catch {
      /* user dismissed */
    }
  }

  async function copyLinkOnly() {
    if (!post) return;
    const { url } = sharePayload(post, origin);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed left-1/2 top-1/2 w-[min(22rem,calc(100%_-_2rem))] max-h-[min(88dvh,28rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-[#2a3344] bg-[#171c26] p-4 text-[#e8ecf4] shadow-2xl open:block [&::backdrop]:bg-black/60"
      aria-labelledby={`${formIdPrefix}-send-apps-title`}
    >
      {post ? (
        <>
          <div className="flex items-start justify-between gap-2">
            <h3 id={`${formIdPrefix}-send-apps-title`} className="m-0 text-sm font-semibold text-[#e8ecf4]">
              Enviar post
            </h3>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-md px-2 py-1 text-[0.7rem] font-semibold text-[#8b95a8] hover:bg-[#1e2533] hover:text-[#e8ecf4]"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
          <p className="mt-2 mb-0 text-[0.7rem] leading-snug text-[#8b95a8]">
            Escolhe uma app. No telemóvel podes também usar o menu do sistema (WhatsApp, Gmail, Telegram…).
          </p>

          <div className="mt-3 flex flex-col gap-2">
            {canNativeShare ? (
              <MintSlatePanelButton type="button" variant="mint" className="w-full" onClick={() => void tryNativeShare()}>
                Menu do sistema (partilhar…)
              </MintSlatePanelButton>
            ) : null}

            {appLinks ? (
              <>
                <a
                  href={appLinks.wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center rounded-lg border border-[#2a3344] bg-[#1e2533] py-2.5 text-center text-[0.75rem] font-semibold text-[#e8ecf4] hover:border-[#3d4a60] hover:bg-[#232b3a]"
                >
                  WhatsApp
                </a>
                <a
                  href={appLinks.tg}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center rounded-lg border border-[#2a3344] bg-[#1e2533] py-2.5 text-center text-[0.75rem] font-semibold text-[#e8ecf4] hover:border-[#3d4a60] hover:bg-[#232b3a]"
                >
                  Telegram
                </a>
                <a
                  href={appLinks.mail}
                  className="flex w-full items-center justify-center rounded-lg border border-[#2a3344] bg-[#1e2533] py-2.5 text-center text-[0.75rem] font-semibold text-[#e8ecf4] hover:border-[#3d4a60] hover:bg-[#232b3a]"
                >
                  E-mail
                </a>
              </>
            ) : null}

            <p className="m-0 text-[0.62rem] text-[#5c6678]">
              Instagram não tem partilha web com texto; usa &quot;Copiar link&quot; e cola na app.
            </p>
            <MintSlatePanelButton type="button" variant="slate" className="w-full" onClick={() => void copyLinkOnly()}>
              Copiar link (Instagram, etc.)
            </MintSlatePanelButton>
          </div>
        </>
      ) : null}
    </dialog>
  );
}

function buildAppLinks(post: FriendFeedPostItem, origin: string) {
  const { url, fullShare, listName } = sharePayload(post, origin);
  const wa = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullShare)}`;
  const tg = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`${listName} — Jam Session`)}`;
  const mail = `mailto:?subject=${encodeURIComponent("Jam Session — Feed")}&body=${encodeURIComponent(fullShare)}`;
  return { wa, tg, mail };
}
