"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FeedPostLinkPreview } from "@/app/(private)/app/feed/FeedPostLinkPreview";
import { ProfileAvatarBubble } from "@/components/avatar/ProfileAvatarBubble";
import { ShowWhen } from "@/components/conditional";
import { setFollowStateAction } from "@/lib/actions/friends-actions";
import { getAvatarInitials } from "@/lib/auth/user-display";
import { renderBodyWithLinks } from "@/lib/feed/render-body-with-links";
import type { AppLocale } from "@/lib/i18n/locales";
import type { CoverGalleryScope } from "@/lib/navigation/cover-gallery-href";
import { coverGalleryArtistHref, coverGalleryArtistWithSongHref, coverGallerySongHref } from "@/lib/navigation/cover-gallery-href";
import type { CoverGalleryPageModel, CoverGalleryPostItem } from "@/lib/platform/cover-gallery-service";

type CoversGalleryPanelProps = {
  locale: AppLocale;
  model: CoverGalleryPageModel;
  viewerId: string;
  initialFollowingUserIds: string[];
};

function formatCardWhen(iso: string, locale: AppLocale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return locale === "pt" ? "Data desconhecida" : "Unknown date";
  return d.toLocaleString(locale === "pt" ? "pt-BR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function CoversGalleryPanel({ locale, model, viewerId, initialFollowingUserIds }: CoversGalleryPanelProps) {
  const pt = locale === "pt";
  const router = useRouter();
  const followingBootstrapKey = useMemo(() => {
    const ids = [...initialFollowingUserIds];
    ids.sort();
    return ids.join("|");
  }, [initialFollowingUserIds]);
  const [followingBootstrapKeyState, setFollowingBootstrapKeyState] = useState(followingBootstrapKey);
  const [following, setFollowing] = useState(() => new Set(initialFollowingUserIds));
  const [followBusyIds, setFollowBusyIds] = useState<Set<string>>(() => new Set());
  const [followError, setFollowError] = useState<string | null>(null);

  if (followingBootstrapKey !== followingBootstrapKeyState) {
    setFollowingBootstrapKeyState(followingBootstrapKey);
    setFollowing(new Set(initialFollowingUserIds));
  }

  async function followAuthor(targetUserId: string) {
    if (targetUserId === viewerId) return;
    if (followBusyIds.has(targetUserId)) return;
    setFollowError(null);
    setFollowBusyIds((prev) => new Set(prev).add(targetUserId));
    const res = await setFollowStateAction({ targetUserId, follow: true });
    setFollowBusyIds((prev) => {
      const next = new Set(prev);
      next.delete(targetUserId);
      return next;
    });
    if (res.error) {
      setFollowError(res.error);
      return;
    }
    setFollowing((prev) => {
      const next = new Set(prev);
      next.add(targetUserId);
      return next;
    });
    router.refresh();
  }

  const headline = useMemo(() => {
    if (model.kind === "song") {
      return pt ? "Vídeos no feed" : "Feed videos";
    }
    if (model.kind === "artist") {
      return pt ? "Vídeos no feed (artista)" : "Feed videos (artist)";
    }
    return pt ? "Vídeos no feed" : "Feed videos";
  }, [model.kind, pt]);

  const subline = useMemo(() => {
    if (model.kind === "song") {
      return `${model.song.artist} — ${model.song.title}`;
    }
    if (model.kind === "artist") {
      if (model.filteredSongId) {
        const t = model.songsForFilter.find((s) => s.id === model.filteredSongId)?.title ?? "";
        return `${model.artist} · ${t}`;
      }
      return model.artist;
    }
    return pt
      ? "Posts do feed com vídeo (YouTube, Drive, Vimeo ou ficheiro) e música associada ao catálogo."
      : "Feed posts with a video link (YouTube, Drive, Vimeo, or file) and a linked catalog song.";
  }, [model, pt]);

  function onFilterSongChange(songId: string) {
    if (model.kind !== "artist") return;
    const sc = model.scope;
    if (!songId) {
      router.push(coverGalleryArtistHref(model.artist, sc));
      return;
    }
    router.push(coverGalleryArtistWithSongHref(model.artist, songId, sc));
  }

  function setScope(next: CoverGalleryScope) {
    if (model.kind !== "song" && model.kind !== "artist") return;
    const sc = model.scope;
    if (next === sc) return;
    if (model.kind === "song") {
      router.push(coverGallerySongHref(model.song.id, next));
      return;
    }
    if (model.filteredSongId) {
      router.push(coverGalleryArtistWithSongHref(model.artist, model.filteredSongId, next));
      return;
    }
    router.push(coverGalleryArtistHref(model.artist, next));
  }

  const posts = model.kind === "song" || model.kind === "artist" ? model.posts : [];

  return (
    <main className="mx-auto w-full max-w-5xl pb-8">
      <h2 className="m-0 text-xl font-semibold text-[#e8ecf4]">{headline}</h2>
      <p className="mt-1 text-sm text-[#8b95a8]">{subline}</p>

      {model.kind === "empty" ? (
        <p className="mt-4 rounded-xl border border-dashed border-[#2a3344] bg-[#111722] p-4 text-sm text-[#8b95a8]">
          {pt ? (
            <>
              Abra esta página a partir de uma música no{" "}
              <Link href="/app/songs" className="font-semibold text-[#6ee7b7] hover:text-[#a7f3d0]">
                catálogo
              </Link>
              , do feed ou de um post no canal — os links abrem os vídeos dos posts associados à música ou ao artista.
            </>
          ) : (
            <>
              Open this page from a song in the{" "}
              <Link href="/app/songs" className="font-semibold text-[#6ee7b7] hover:text-[#a7f3d0]">
                catalog
              </Link>
              , the feed, or a channel post — links open feed videos for that song or artist.
            </>
          )}
        </p>
      ) : null}

      {model.kind === "song" || model.kind === "artist" ? (
        <div
          className="mt-3 flex flex-wrap gap-2"
          role="group"
          aria-label={pt ? "Origem dos posts" : "Post source"}
        >
          <button
            type="button"
            onClick={() => setScope("all")}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              model.scope === "all"
                ? "border-[#6ee7b7]/50 bg-[color-mix(in_srgb,#6ee7b7_14%,#1e2533)] text-[#e8ecf4]"
                : "border-[#2a3344] bg-[#1e2533] text-[#8b95a8] hover:border-[#3d4a60] hover:text-[#c8cedd]"
            }`}
          >
            {pt ? "Ver tudo" : "See all"}
          </button>
          <button
            type="button"
            onClick={() => setScope("friends")}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              model.scope === "friends"
                ? "border-[#6ee7b7]/50 bg-[color-mix(in_srgb,#6ee7b7_14%,#1e2533)] text-[#e8ecf4]"
                : "border-[#2a3344] bg-[#1e2533] text-[#8b95a8] hover:border-[#3d4a60] hover:text-[#c8cedd]"
            }`}
          >
            {pt ? "Dos meus amigos" : "People I follow"}
          </button>
        </div>
      ) : null}

      {model.kind === "song" ? (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
          <Link className="text-[#93c5fd] hover:text-[#bfdbfe]" href={coverGalleryArtistHref(model.song.artist, model.scope)}>
            {pt ? "Todos os vídeos deste artista no feed" : "All feed videos for this artist"}
          </Link>
          <span className="text-[#4a5568]">·</span>
          <Link className="text-[#93c5fd] hover:text-[#bfdbfe]" href="/app/feed">
            {pt ? "Abrir feed" : "Open feed"}
          </Link>
        </div>
      ) : null}

      {model.kind === "artist" ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold">
            <Link className="text-[#93c5fd] hover:text-[#bfdbfe]" href="/app/feed">
              {pt ? "Abrir feed" : "Open feed"}
            </Link>
            {model.filteredSongId ? (
              <>
                <span className="text-[#4a5568]">·</span>
                <Link className="text-[#93c5fd] hover:text-[#bfdbfe]" href={coverGalleryArtistHref(model.artist, model.scope)}>
                  {pt ? "Ver todos os vídeos do artista" : "All artist videos"}
                </Link>
              </>
            ) : null}
          </div>
          {model.songsForFilter.length > 0 ? (
            <label className="flex min-w-0 max-w-full flex-col gap-1 text-[0.65rem] font-semibold uppercase tracking-wide text-[#8b95a8] sm:max-w-xs">
              {pt ? "Filtrar por música" : "Filter by song"}
              <select
                value={model.filteredSongId ?? ""}
                onChange={(e) => onFilterSongChange(e.target.value)}
                className="rounded-md border border-[#2a3344] bg-[#0f1218] px-2 py-1.5 text-[0.8rem] font-normal normal-case text-[#e8ecf4]"
              >
                <option value="">{pt ? "Todas as músicas deste artista" : "All songs by this artist"}</option>
                {model.songsForFilter.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      {model.kind === "song" || model.kind === "artist" ? (
        <ul className="mt-5 m-0 grid list-none grid-cols-1 gap-4 p-0 lg:grid-cols-2">
          <ShowWhen when={!!followError}>
            <li className="col-span-full m-0 list-none">
              <p className="m-0 text-center text-xs text-[#fca5a5]" role="alert">
                {followError}
              </p>
            </li>
          </ShowWhen>
          {posts.length === 0 ? (
            <li className="col-span-full rounded-xl border border-dashed border-[#2a3344] bg-[#111722] p-6 text-center text-sm text-[#8b95a8]">
              {model.scope === "friends"
                ? pt
                  ? "Nenhum vídeo de contas que segues para esta seleção. Experimente «Ver tudo» ou siga mais pessoas no feed."
                  : "No videos from people you follow for this selection. Try «See all» or follow more people in the feed."
                : pt
                  ? "Ainda não há posts no feed com vídeo associado a esta seleção."
                  : "No feed posts with a video match this selection yet."}
            </li>
          ) : (
            posts.map((p) => (
              <GalleryPostCard
                key={p.id}
                post={p}
                locale={locale}
                scope={model.scope}
                viewerId={viewerId}
                isFollowing={following.has(p.authorId)}
                followBusy={followBusyIds.has(p.authorId)}
                onFollow={() => void followAuthor(p.authorId)}
              />
            ))
          )}
        </ul>
      ) : null}
    </main>
  );
}

function GalleryPostCard({
  post,
  locale,
  scope,
  viewerId,
  isFollowing,
  followBusy,
  onFollow,
}: {
  post: CoverGalleryPostItem;
  locale: AppLocale;
  scope: CoverGalleryScope;
  viewerId: string;
  isFollowing: boolean;
  followBusy: boolean;
  onFollow: () => void;
}) {
  const pt = locale === "pt";
  const showFollow = post.authorId !== viewerId && !isFollowing;
  const initials = getAvatarInitials(
    post.authorDisplayName?.trim() || post.authorUsername?.trim() || post.authorLabel,
    undefined,
  );
  const feedHash = `/app/feed#feed-post-${post.id}`;
  return (
    <li className="min-w-0 overflow-hidden rounded-xl border border-[#2a3344] bg-[#111722] p-4">
      <div className="flex min-w-0 items-start gap-2">
        <ProfileAvatarBubble url={post.authorAvatarUrl} initials={initials} size="sm" decorative />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[#e8ecf4]">{post.authorLabel}</span>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {showFollow ? (
                <button
                  type="button"
                  onClick={onFollow}
                  disabled={followBusy}
                  className="rounded-md border border-[#6ee7b7]/45 bg-[color-mix(in_srgb,#6ee7b7_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[#6ee7b7] hover:bg-[color-mix(in_srgb,#6ee7b7_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {followBusy ? "…" : pt ? "Seguir" : "Follow"}
                </button>
              ) : null}
              <time className="text-[11px] text-[#8b95a8]" dateTime={post.createdAt}>
                {formatCardWhen(post.createdAt, locale)}
              </time>
            </div>
          </div>
          {post.authorUsername ? (
            <p className="mt-0.5 truncate text-xs text-[#8b95a8]">@{post.authorUsername}</p>
          ) : null}
          <p className="mt-2 min-w-0 whitespace-pre-wrap wrap-anywhere text-sm leading-snug text-[#e8ecf4]">
            {renderBodyWithLinks(post.body)}
          </p>
          <p className="mt-2 text-[0.65rem] text-[#8b95a8]">
            <span className="font-semibold text-[#6ee7b7]">{pt ? "Música" : "Song"}</span>
            {": "}
            <Link href={coverGallerySongHref(post.songId, scope)} className="font-semibold text-[#93c5fd] hover:text-[#bfdbfe]">
              {post.songArtist} — {post.songTitle}
            </Link>
          </p>
          <div className="mt-3 w-full min-w-0 max-w-full overflow-x-hidden">
            <FeedPostLinkPreview url={post.videoUrl} locale={locale} />
          </div>
          <div className="mt-3">
            <Link
              href={feedHash}
              className="text-xs font-semibold text-[#6ee7b7] hover:text-[#a7f3d0]"
            >
              {pt ? "Ver no feed" : "View in feed"}
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}
