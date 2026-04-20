"use client";

import type { RefObject } from "react";
import { useMemo } from "react";
import { ShareViaAppsDialog, type ShareViaAppsPayload } from "@/components/sharing/share-via-apps-dialog";
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

function feedPostToSharePayload(post: FriendFeedPostItem | null): ShareViaAppsPayload | null {
  if (!post || typeof window === "undefined") return null;
  const origin = window.location.origin;
  const { url, listName, fullShare } = sharePayload(post, origin);
  return {
    url,
    summaryLine: `${listName} — Jam Session`,
    fullShare,
    emailSubject: "Jam Session — Feed",
    heading: "Enviar post",
    nativeShareTitle: "Jam Session",
  };
}

export function FeedPostSendAppsDialog({ dialogRef, post, formIdPrefix, onClose }: FeedPostSendAppsDialogProps) {
  const payload = useMemo(() => feedPostToSharePayload(post), [post]);
  return <ShareViaAppsDialog dialogRef={dialogRef} payload={payload} idPrefix={formIdPrefix} onClose={onClose} />;
}
