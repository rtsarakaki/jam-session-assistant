"use client";

type FeedPostLinkedInActionsProps = {
  commentCount: number;
  commentsOpen: boolean;
  liked: boolean;
  likeBusy?: boolean;
  sharePosting?: boolean;
  disabled?: boolean;
  onToggleLike: () => void;
  onToggleComments: () => void;
  onShareToMyFeed: () => void;
  onSend: () => void;
};

function IconLike({ filled }: { filled: boolean }) {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function IconComment() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
      />
    </svg>
  );
}

function IconRepost() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 1l4 4-4 4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 23l-4-4 4-4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

/** Feed card actions: icon-only row (labels via aria-label / title). */
export function FeedPostLinkedInActions({
  commentCount,
  commentsOpen,
  liked,
  likeBusy,
  sharePosting,
  disabled,
  onToggleLike,
  onToggleComments,
  onShareToMyFeed,
  onSend,
}: FeedPostLinkedInActionsProps) {
  const countLabel = commentCount > 99 ? "99+" : String(commentCount);

  const actionClass =
    "flex min-h-11 w-full min-w-0 max-w-full items-center justify-center border-r border-[#2a3344] px-0 py-2 transition-colors last:border-r-0 disabled:cursor-not-allowed disabled:opacity-45";

  const iconWrap = "relative flex shrink-0 items-center justify-center";

  return (
    <div className="grid w-full min-w-0 max-w-full grid-cols-[repeat(4,minmax(0,1fr))] overflow-x-hidden">
      <button
        type="button"
        disabled={disabled || likeBusy}
        onClick={onToggleLike}
        className={`${actionClass} ${liked ? "text-[#6ee7b7]" : "text-[#8b95a8] hover:bg-[#1a202c] hover:text-[#d1d7e3]"}`}
        aria-pressed={liked}
        aria-busy={likeBusy}
        aria-label={likeBusy ? "Updating like…" : liked ? "Unlike" : "Like this post"}
        title={likeBusy ? "Updating…" : liked ? "Unlike" : "Like"}
      >
        <span className={`${iconWrap} ${likeBusy ? "animate-pulse opacity-70" : ""}`}>
          <IconLike filled={liked} />
        </span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onToggleComments}
        className={`${actionClass} ${commentsOpen ? "text-[#6ee7b7]" : "text-[#8b95a8] hover:bg-[#1a202c] hover:text-[#d1d7e3]"}`}
        aria-expanded={commentsOpen}
        aria-label={
          commentCount
            ? `${commentsOpen ? "Hide" : "Show"} comments (${commentCount})`
            : commentsOpen
              ? "Hide comments"
              : "Comment"
        }
        title={commentsOpen ? "Hide comments" : "Comment or view comments"}
      >
        <span className={iconWrap}>
          <IconComment />
          {commentCount > 0 ? (
            <span className="absolute -right-2.5 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#2a3344] px-0.5 text-[0.5rem] font-bold leading-none text-[#b8c0d0] ring-1 ring-[#171c26]">
              {countLabel}
            </span>
          ) : null}
        </span>
      </button>
      <button
        type="button"
        disabled={disabled || sharePosting}
        onClick={onShareToMyFeed}
        className={`${actionClass} ${sharePosting ? "text-[#6ee7b7]" : "text-[#8b95a8] hover:bg-[#1a202c] hover:text-[#d1d7e3]"}`}
        aria-busy={sharePosting}
        aria-label={sharePosting ? "Adding to your feed…" : "Share to your feed (quotes this post)"}
        title="Post a quoted copy to your feed"
      >
        <span className={`${iconWrap} ${sharePosting ? "animate-pulse opacity-70" : ""}`}>
          <IconRepost />
        </span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onSend}
        className={`${actionClass} text-[#8b95a8] hover:bg-[#1a202c] hover:text-[#d1d7e3]`}
        aria-label="Send post (WhatsApp, Telegram, email…)"
        title="Send via WhatsApp, Telegram, email…"
      >
        <span className={iconWrap}>
          <IconSend />
        </span>
      </button>
    </div>
  );
}
