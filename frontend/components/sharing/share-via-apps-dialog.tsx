"use client";

import type { RefObject } from "react";
import { MintSlatePanelButton } from "@/components/buttons/MintSlatePanelButton";

export type ShareViaAppsPayload = {
  url: string;
  /** Short line for Telegram `text` and Web Share API `text`. */
  summaryLine: string;
  /** Full message for WhatsApp and email body (usually includes the URL). */
  fullShare: string;
  emailSubject: string;
  /** Dialog title (h3). */
  heading: string;
  /** Optional Web Share API title; defaults to `heading`. */
  nativeShareTitle?: string;
};

type ShareViaAppsDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  payload: ShareViaAppsPayload | null;
  idPrefix: string;
  onClose: () => void;
};

const iconClass = "h-6 w-6 shrink-0";

function IconSystemShare({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.59 13.51 15.42 17.49M15.41 6.51 8.59 10.49" />
    </svg>
  );
}

function IconWhatsApp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function IconTelegram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function IconMail({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function IconCopyLink({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1M8 5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2M8 5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2" />
    </svg>
  );
}

const shareTileClass =
  "flex h-14 flex-col items-center justify-center rounded-xl border border-[#2a3344] bg-[#1e2533] text-[#e8ecf4] transition-colors hover:border-[#3d4a60] hover:bg-[#232b3a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6ee7b7]";

function buildAppLinks(payload: ShareViaAppsPayload) {
  const wa = `https://api.whatsapp.com/send?text=${encodeURIComponent(payload.fullShare)}`;
  const tg = `https://t.me/share/url?url=${encodeURIComponent(payload.url)}&text=${encodeURIComponent(payload.summaryLine)}`;
  const mail = `mailto:?subject=${encodeURIComponent(payload.emailSubject)}&body=${encodeURIComponent(payload.fullShare)}`;
  return { wa, tg, mail };
}

/** WhatsApp, Telegram, email, copy link, optional system share — same UX as feed “Send”. */
export function ShareViaAppsDialog({ dialogRef, payload, idPrefix, onClose }: ShareViaAppsDialogProps) {
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const appLinks = payload ? buildAppLinks(payload) : null;

  async function tryNativeShare() {
    if (!payload || !canNativeShare) return;
    try {
      await navigator.share({
        title: payload.nativeShareTitle ?? payload.heading,
        text: payload.summaryLine,
        url: payload.url,
      });
      dialogRef.current?.close();
    } catch {
      /* user dismissed */
    }
  }

  async function copyLinkOnly() {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload.url);
    } catch {
      /* ignore */
    }
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed left-1/2 top-1/2 w-[min(22rem,calc(100%-2rem))] max-h-[min(88dvh,28rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-[#2a3344] bg-[#171c26] p-4 text-[#e8ecf4] shadow-2xl open:block backdrop:bg-black/60"
      aria-labelledby={`${idPrefix}-send-apps-title`}
    >
      {payload ? (
        <>
          <div className="flex items-start justify-between gap-2">
            <h3 id={`${idPrefix}-send-apps-title`} className="m-0 text-sm font-semibold text-[#e8ecf4]">
              {payload.heading}
            </h3>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-md px-2 py-1 text-[0.7rem] font-semibold text-[#8b95a8] hover:bg-[#1e2533] hover:text-[#e8ecf4]"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <p className="mt-2 mb-0 text-[0.7rem] leading-snug text-[#8b95a8]">
            Pick an app. On mobile you can also use the system share sheet (WhatsApp, Gmail, Telegram…).
          </p>

          <div className="mt-3 flex flex-col gap-2">
            {canNativeShare ? (
              <MintSlatePanelButton
                type="button"
                variant="mint"
                className="flex w-full items-center justify-center gap-2"
                onClick={() => void tryNativeShare()}
              >
                <IconSystemShare className={`${iconClass} text-[#0b141a]`} />
                <span className="text-[0.8rem] font-semibold">System share</span>
              </MintSlatePanelButton>
            ) : null}

            {appLinks ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <a
                  href={appLinks.wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${shareTileClass} text-[#25D366]`}
                  aria-label="Share on WhatsApp"
                  title="WhatsApp"
                >
                  <IconWhatsApp className={iconClass} />
                </a>
                <a
                  href={appLinks.tg}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${shareTileClass} text-[#2AABEE]`}
                  aria-label="Share on Telegram"
                  title="Telegram"
                >
                  <IconTelegram className={iconClass} />
                </a>
                <a
                  href={appLinks.mail}
                  className={`${shareTileClass} text-[#a8b4cc]`}
                  aria-label="Share by email"
                  title="Email"
                >
                  <IconMail className={iconClass} />
                </a>
                <button
                  type="button"
                  onClick={() => void copyLinkOnly()}
                  className={`${shareTileClass} cursor-pointer text-[#8b95a8]`}
                  aria-label="Copy link for Instagram or other apps"
                  title="Copy link"
                >
                  <IconCopyLink className={iconClass} />
                </button>
              </div>
            ) : null}

            <p className="m-0 text-[0.62rem] text-[#5c6678]">
              Instagram has no web share with text; use the link icon and paste in the app.
            </p>
          </div>
        </>
      ) : null}
    </dialog>
  );
}

export function buildJamInviteSharePayload(inviteUrl: string, sessionTitle: string): ShareViaAppsPayload {
  const label = sessionTitle.trim() || "Jam session";
  const summaryLine = `Join this jam: ${label}`;
  const fullShare = `${summaryLine}\n\n${inviteUrl}`;
  return {
    url: inviteUrl,
    summaryLine,
    fullShare,
    emailSubject: `Jam Session — ${label}`,
    heading: "Send jam link",
    nativeShareTitle: "Jam Session",
  };
}
