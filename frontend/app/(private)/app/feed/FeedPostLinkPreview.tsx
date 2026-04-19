"use client";

import { useEffect, useMemo, useState } from "react";
import type { LinkPreviewData } from "@/lib/platform/link-preview-types";
import { googleDrivePreviewEmbedSrc, parseGoogleDriveFileId } from "@/lib/validation/google-drive-url";
import { parseYouTubeVideoId, youtubeEmbedSrc } from "@/lib/validation/youtube-url";

type FeedPostLinkPreviewProps = {
  url: string;
};

function hostnameOf(u: string): string {
  try {
    return new URL(u).hostname;
  } catch {
    return u;
  }
}

function YouTubeFeedEmbed({ videoId, originalUrl }: { videoId: string; originalUrl: string }) {
  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-[#2a3344] bg-[#0a0a0a]">
      <div className="relative aspect-video w-full min-w-0 max-w-full overflow-hidden bg-black">
        <iframe
          className="absolute inset-0 box-border h-full w-full min-w-0 max-w-full border-0"
          style={{ width: "100%", maxWidth: "100%" }}
          src={youtubeEmbedSrc(videoId)}
          title="YouTube video player"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      <a
        href={originalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block min-w-0 max-w-full border-t border-[#2a3344] px-2.5 py-1.5 text-[0.65rem] font-medium text-[#6ee7b7] hover:bg-[#12161d]"
      >
        Open on YouTube
      </a>
    </div>
  );
}

function GoogleDriveFeedEmbed({ fileId, originalUrl }: { fileId: string; originalUrl: string }) {
  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-[#2a3344] bg-[#0a0a0a]">
      <div className="relative aspect-video w-full min-h-[200px] min-w-0 max-w-full overflow-hidden bg-[#111]">
        <iframe
          className="absolute inset-0 box-border h-full w-full min-w-0 max-w-full border-0"
          style={{ width: "100%", maxWidth: "100%" }}
          src={googleDrivePreviewEmbedSrc(fileId)}
          title="Google Drive preview"
          allow="fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      <a
        href={originalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block min-w-0 max-w-full border-t border-[#2a3344] px-2.5 py-1.5 text-[0.65rem] font-medium text-[#6ee7b7] hover:bg-[#12161d]"
      >
        Open in Google Drive
      </a>
    </div>
  );
}

/** YouTube / Google Drive: embedded preview. Other URLs: OG preview via server fetch. */
export function FeedPostLinkPreview({ url }: FeedPostLinkPreviewProps) {
  const youTubeId = useMemo(() => parseYouTubeVideoId(url), [url]);
  const driveFileId = useMemo(() => parseGoogleDriveFileId(url), [url]);

  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ok"; data: LinkPreviewData }
    | { status: "fallback"; error: string }
  >({ status: "loading" });

  useEffect(() => {
    if (youTubeId || driveFileId) return;
    let cancelled = false;
    (async () => {
      let res: { error: string | null; preview?: LinkPreviewData };
      try {
        const http = await fetch("/api/link-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        res = (await http.json()) as typeof res;
      } catch {
        res = { error: "Could not load preview." };
      }
      if (cancelled) return;
      if (res.error || !res.preview) {
        setState({ status: "fallback", error: res.error ?? "No preview." });
        return;
      }
      setState({ status: "ok", data: res.preview });
    })();
    return () => {
      cancelled = true;
    };
  }, [url, youTubeId, driveFileId]);

  if (youTubeId) {
    return <YouTubeFeedEmbed videoId={youTubeId} originalUrl={url} />;
  }

  if (driveFileId) {
    return <GoogleDriveFeedEmbed fileId={driveFileId} originalUrl={url} />;
  }

  if (state.status === "loading") {
    return (
      <div className="min-w-0 max-w-full overflow-hidden rounded-lg border border-[#2a3344] bg-[#0f1218]">
        <div className="h-28 animate-pulse bg-[#1e2533]" />
        <div className="space-y-1.5 p-2">
          <div className="h-3 w-2/3 rounded bg-[#1e2533]" />
          <div className="h-2 w-full rounded bg-[#1e2533]" />
        </div>
      </div>
    );
  }

  if (state.status === "fallback") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 max-w-full items-center gap-2 rounded-lg border border-[#2a3344] bg-[#0f1218] px-2.5 py-2 text-[0.7rem] text-[#6ee7b7] underline-offset-2 hover:underline"
      >
        <span className="font-medium">{hostnameOf(url)}</span>
        <span className="min-w-0 flex-1 truncate text-[#8b95a8] no-underline">{url}</span>
      </a>
    );
  }

  const { data } = state;
  const title = data.title?.trim() || hostnameOf(data.url);
  const desc = data.description?.trim();
  const label = data.siteName?.trim() || hostnameOf(data.url);

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-w-0 max-w-full flex-col overflow-hidden rounded-lg border border-[#2a3344] bg-[#0f1218] text-left transition-colors hover:border-[#3d4a60] hover:bg-[#12161d]"
    >
      {data.imageUrl ? (
        <div className="h-36 w-full min-w-0 max-w-full overflow-hidden bg-[#1e2533]">
          {/* eslint-disable-next-line @next/next/no-img-element -- remote OG images; arbitrary origins */}
          <img
            src={data.imageUrl}
            alt="Link preview image"
            className="h-full w-full max-w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}
      <div className="min-w-0 p-2.5">
        <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-[#8b95a8]">{label}</p>
        <p className="mt-0.5 line-clamp-2 text-[0.78rem] font-semibold leading-snug text-[#e8ecf4]">{title}</p>
        {desc ? (
          <p className="mt-1 line-clamp-2 text-[0.68rem] leading-snug text-[#9aa3b5]">{desc}</p>
        ) : null}
      </div>
    </a>
  );
}
