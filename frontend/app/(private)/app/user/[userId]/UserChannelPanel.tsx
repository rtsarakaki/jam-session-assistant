"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FeedPostLinkPreview } from "@/app/(private)/app/feed/FeedPostLinkPreview";
import { loadMoreUserChannelActivitiesAction } from "@/lib/actions/user-channel-actions";
import { ProfileAvatarBubble } from "@/components/avatar/ProfileAvatarBubble";
import { renderBodyWithLinks } from "@/lib/feed/render-body-with-links";
import type { AppLocale } from "@/lib/i18n/locales";
import type { PublicProfileCard } from "@/lib/platform/friends-service";
import type {
  UserChannelActivityItem,
  UserChannelRegisteredSong,
  UserChannelSnapshot,
} from "@/lib/platform/user-channel-service";
import { extractFirstHttpUrl } from "@/lib/validation/feed-url";

type UserChannelPanelProps = {
  locale: AppLocale;
  snapshot: UserChannelSnapshot;
};

type ActivityKind = UserChannelActivityItem["kind"];
type ActivityFilter = "all" | ActivityKind;

function songLinkPreviewUrl(song: UserChannelRegisteredSong): string | null {
  const hasLyrics = Boolean(song.lyricsUrl?.trim());
  if (!hasLyrics && song.listenUrl?.trim()) {
    return extractFirstHttpUrl(song.listenUrl.trim());
  }
  const fromListen = song.listenUrl?.trim() ? extractFirstHttpUrl(song.listenUrl.trim()) : null;
  if (fromListen) return fromListen;
  return song.lyricsUrl?.trim() ? extractFirstHttpUrl(song.lyricsUrl.trim()) : null;
}

function formatWhen(iso: string, locale: AppLocale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return locale === "pt" ? "Data desconhecida" : "Unknown date";
  return d.toLocaleString(locale === "pt" ? "pt-BR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function initialsFromCard(p: PublicProfileCard): string {
  const base = p.displayName?.trim() || p.username?.trim() || p.listName;
  const letters = base.replace(/^@/, "").trim();
  if (!letters) return "?";
  return letters.slice(0, 2).toUpperCase();
}

export function UserChannelPanel({ locale, snapshot }: UserChannelPanelProps) {
  const pt = locale === "pt";
  const p = snapshot.profile;
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [activities, setActivities] = useState<UserChannelActivityItem[]>(() => snapshot.activities);
  const [hasMore, setHasMore] = useState(snapshot.activitiesHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActivities(snapshot.activities);
      setHasMore(snapshot.activitiesHasMore);
      setLoadError(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [snapshot.channelUserId, snapshot.activities, snapshot.activitiesHasMore]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setLoadError(null);
    const skip = activities.length;
    const res = await loadMoreUserChannelActivitiesAction({
      channelUserId: snapshot.channelUserId,
      skip,
    });
    if (res.error) {
      setLoadError(res.error);
      setLoadingMore(false);
      return;
    }
    setActivities((prev) => {
      const seen = new Set(prev.map((r) => r.key));
      const appended = res.items.filter((r) => !seen.has(r.key));
      return [...prev, ...appended];
    });
    setHasMore(res.hasMore);
    setLoadingMore(false);
  }, [activities.length, hasMore, loadingMore, snapshot.channelUserId]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { root: null, rootMargin: "280px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [activityFilter, hasMore, loadMore]);

  const countsByKind = useMemo(() => {
    const out: Record<ActivityKind, number> = { post: 0, follow: 0, jam: 0, song: 0 };
    for (const row of activities) {
      out[row.kind] += 1;
    }
    return out;
  }, [activities]);

  const visibleActivities = useMemo(() => {
    if (activityFilter === "all") return activities;
    return activities.filter((row) => row.kind === activityFilter);
  }, [activities, activityFilter]);

  const mutualIds = useMemo(() => new Set(snapshot.mutualFollowUserIds), [snapshot.mutualFollowUserIds]);

  const filterChips: { id: ActivityFilter; label: string }[] = [
    { id: "all", label: pt ? "Todas" : "All" },
    { id: "post", label: pt ? "Posts" : "Posts" },
    { id: "song", label: pt ? "Músicas" : "Songs" },
    { id: "follow", label: pt ? "Amigos" : "Friends" },
    { id: "jam", label: pt ? "Jams" : "Jams" },
  ];

  return (
    <main id="app-main" className="mx-auto w-full max-w-7xl pb-10">
      <section className="rounded-2xl border border-[#2a3344] bg-[#171c26] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.22)] sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <ProfileAvatarBubble url={p?.avatarUrl ?? null} initials={p ? initialsFromCard(p) : "?"} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="m-0 text-xl font-semibold text-[#e8ecf4]">
              {snapshot.isOwnChannel
                ? pt
                  ? "Minhas atividades"
                  : "My activities"
                : (p?.listName ?? (pt ? "Atividades" : "Activities"))}
              {snapshot.isOwnChannel ? (
                <span className="ml-2 rounded-md border border-[#6ee7b7]/50 bg-[color-mix(in_srgb,#6ee7b7_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6ee7b7]">
                  {pt ? "Você" : "You"}
                </span>
              ) : null}
            </h1>
            {p?.username ? (
              <p className="mt-1 text-sm text-[#8b95a8]">
                @{p.username}
              </p>
            ) : null}
            {p?.bio ? <p className="mt-3 text-sm leading-relaxed text-[#c8cedd]">{p.bio}</p> : null}
            {p?.instruments && p.instruments.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {p.instruments.map((inst) => (
                  <span key={inst} className="rounded-md border border-[#2a3344] bg-[#1e2533] px-2 py-0.5 text-[11px] text-[#8b95a8]">
                    {inst}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-[#8b95a8]">
          {pt
            ? "Posts, músicas cadastradas no catálogo, pessoas que segue e jams em que participou — ordenados pela data."
            : "Posts, songs they added to the catalog, people they follow, and jams they joined — ordered by date."}
        </p>

        {activities.length > 0 ? (
          <div
            className="mt-4 flex flex-wrap gap-2"
            role="group"
            aria-label={pt ? "Filtrar por tipo de atividade" : "Filter by activity type"}
          >
            {filterChips.map((chip) => {
              const count =
                chip.id === "all"
                  ? activities.length
                  : countsByKind[chip.id as ActivityKind];
              const selected = activityFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setActivityFilter(chip.id)}
                  aria-pressed={selected}
                  className={[
                    "rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                    selected
                      ? "border-[#6ee7b7]/60 bg-[color-mix(in_srgb,#6ee7b7_14%,#1e2533)] text-[#e8ecf4]"
                      : "border-[#2a3344] bg-[#1e2533] text-[#8b95a8] hover:border-[#3d4a60] hover:text-[#c8cedd]",
                  ].join(" ")}
                >
                  {chip.label}
                  <span className={selected ? "text-[#6ee7b7]" : "text-[#6b7280]"}> ({count})</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {activities.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-[#2a3344] bg-[#111722] p-4 text-sm text-[#8b95a8]">
            {pt ? "Nada para mostrar por aqui ainda." : "Nothing to show here yet."}
          </p>
        ) : visibleActivities.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-[#2a3344] bg-[#111722] p-4 text-sm text-[#8b95a8]">
            {pt ? "Nenhuma atividade deste tipo." : "No activities of this type."}
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {visibleActivities.map((item) => {
              if (item.kind === "post") {
                const previewUrl = extractFirstHttpUrl(item.post.body);
                return (
                  <li key={item.key} className="min-w-0">
                    <article className="flex h-full min-w-0 flex-col rounded-xl border border-[#2a3344] bg-[#111722] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-md border border-[#6ee7b7]/40 bg-[color-mix(in_srgb,#6ee7b7_10%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6ee7b7]">
                          {pt ? "Post" : "Post"}
                        </span>
                        <time className="text-[11px] text-[#8b95a8]" dateTime={item.sortAt}>
                          {formatWhen(item.sortAt, locale)}
                        </time>
                      </div>
                      <p className="mt-2 min-h-0 flex-1 max-w-full whitespace-pre-wrap wrap-anywhere text-sm leading-snug text-[#e8ecf4]">
                        {renderBodyWithLinks(item.post.body)}
                      </p>
                      {previewUrl ? (
                        <div className="mt-3 w-full min-w-0 max-w-full overflow-x-hidden">
                          <FeedPostLinkPreview url={previewUrl} locale={locale} />
                        </div>
                      ) : null}
                      <div className="mt-3 shrink-0">
                        <Link
                          href="/app/feed"
                          className="text-xs font-semibold text-[#6ee7b7] hover:text-[#a7f3d0]"
                        >
                          {pt ? "Abrir feed" : "Open feed"}
                        </Link>
                      </div>
                    </article>
                  </li>
                );
              }
              if (item.kind === "follow") {
                const t = item.edge.target;
                return (
                  <li key={item.key} className="min-w-0">
                    <article className="flex h-full min-w-0 flex-col rounded-xl border border-[#2a3344] bg-[#111722] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-md border border-[#93c5fd]/40 bg-[color-mix(in_srgb,#93c5fd_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#93c5fd]">
                          {pt ? "Amigo" : "Friend"}
                        </span>
                        <time className="text-[11px] text-[#8b95a8]" dateTime={item.sortAt}>
                          {formatWhen(item.sortAt, locale)}
                        </time>
                      </div>
                      <div className="mt-3 flex min-h-0 flex-1 items-center gap-3">
                        <ProfileAvatarBubble
                          url={t.avatarUrl}
                          initials={initialsFromCard(t)}
                          size="lg"
                          activitiesHref={mutualIds.has(t.id) ? `/app/user/${t.id}` : undefined}
                          activitiesAriaLabel={
                            mutualIds.has(t.id)
                              ? pt
                                ? `Atividades de ${t.listName}`
                                : `Activities for ${t.listName}`
                              : undefined
                          }
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#e8ecf4]">{t.listName}</p>
                          {t.username ? <p className="truncate text-xs text-[#8b95a8]">@{t.username}</p> : null}
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-[#8b95a8]">
                        {pt ? "Começou a seguir." : "Started following."}
                      </p>
                      {mutualIds.has(t.id) ? (
                        <div className="mt-3 shrink-0">
                          <Link href={`/app/user/${t.id}`} className="text-xs font-semibold text-[#6ee7b7] hover:text-[#a7f3d0]">
                            {pt ? "Ver atividades" : "View activities"}
                          </Link>
                        </div>
                      ) : null}
                    </article>
                  </li>
                );
              }
              if (item.kind === "song") {
                const s = item.song;
                const hasLyrics = Boolean(s.lyricsUrl?.trim());
                const hasListen = Boolean(s.listenUrl?.trim());
                const listenOnly = !hasLyrics && hasListen;
                const previewUrl = songLinkPreviewUrl(s);
                const showLinksRow = hasLyrics || (hasListen && !listenOnly);
                return (
                  <li key={item.key} className="min-w-0">
                    <article className="flex h-full min-w-0 flex-col rounded-xl border border-[#2a3344] bg-[#111722] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-md border border-[#c4b5fd]/40 bg-[color-mix(in_srgb,#c4b5fd_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#c4b5fd]">
                          {pt ? "Música" : "Song"}
                        </span>
                        <time className="text-[11px] text-[#8b95a8]" dateTime={item.sortAt}>
                          {formatWhen(item.sortAt, locale)}
                        </time>
                      </div>
                      <p className="mt-2 text-xs text-[#8b95a8]">
                        {pt ? "Adicionou a música." : "Added the song."}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#e8ecf4]">{s.title}</p>
                      <p className="mt-0.5 text-xs text-[#8b95a8]">{s.artist}</p>
                      {showLinksRow ? (
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                          {hasLyrics && s.lyricsUrl ? (
                            <a
                              href={s.lyricsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-[#6ee7b7] underline-offset-2 hover:underline"
                            >
                              {pt ? "Letras / partitura" : "Lyrics / sheet"}
                            </a>
                          ) : null}
                          {hasListen && !listenOnly && s.listenUrl ? (
                            <a
                              href={s.listenUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-[#6ee7b7] underline-offset-2 hover:underline"
                            >
                              {pt ? "Ouvir" : "Listen"}
                            </a>
                          ) : null}
                        </div>
                      ) : null}
                      {previewUrl ? (
                        <div className="mt-3 w-full min-w-0 max-w-full shrink-0 overflow-x-hidden">
                          {listenOnly ? (
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#c4b5fd]">
                              {pt ? "Ouvir" : "Listen"}
                            </p>
                          ) : null}
                          <FeedPostLinkPreview url={previewUrl} locale={locale} />
                        </div>
                      ) : listenOnly && s.listenUrl ? (
                        <div className="mt-3 w-full min-w-0 shrink-0">
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#c4b5fd]">
                            {pt ? "Ouvir" : "Listen"}
                          </p>
                          <a
                            href={s.listenUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex w-full items-center justify-center rounded-lg border border-[#6ee7b7]/45 bg-[color-mix(in_srgb,#6ee7b7_10%,#1e2533)] px-3 py-2.5 text-center text-xs font-semibold text-[#6ee7b7] hover:border-[#6ee7b7]/70 hover:bg-[color-mix(in_srgb,#6ee7b7_16%,#1e2533)]"
                          >
                            {pt ? "Ouvir música" : "Listen to song"}
                          </a>
                        </div>
                      ) : null}
                      <div className="mt-3 shrink-0">
                        <Link
                          href="/app/songs"
                          className="text-xs font-semibold text-[#6ee7b7] hover:text-[#a7f3d0]"
                        >
                          {pt ? "Abrir músicas" : "Open songs"}
                        </Link>
                      </div>
                    </article>
                  </li>
                );
              }
              const j = item.jam;
              return (
                <li key={item.key} className="min-w-0">
                  <article className="flex h-full min-w-0 flex-col rounded-xl border border-[#2a3344] bg-[#111722] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-md border border-[#fcd34d]/40 bg-[color-mix(in_srgb,#fcd34d_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#fcd34d]">
                        {pt ? "Jam" : "Jam"}
                      </span>
                      <time className="text-[11px] text-[#8b95a8]" dateTime={item.sortAt}>
                        {formatWhen(item.sortAt, locale)}
                      </time>
                    </div>
                    <p className="mt-2 min-h-0 flex-1 text-sm font-medium text-[#e8ecf4]">{j.title}</p>
                    <p className="mt-1 text-xs text-[#8b95a8]">
                      {j.status}
                      {j.isOwner ? (
                        <span className="ml-2 rounded border border-[#6ee7b7]/40 px-1.5 py-0.5 text-[10px] font-semibold text-[#6ee7b7]">
                          {pt ? "Dono" : "Owner"}
                        </span>
                      ) : null}
                    </p>
                    {j.participants.length > 0 ? (
                      <div className="mt-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8b95a8]">
                          {pt ? "Participantes" : "Participants"}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {j.participants.slice(0, 6).map((participant) => (
                            <span
                              key={participant.id}
                              className="inline-flex items-center rounded-md border border-[#2a3344] bg-[#1e2533] px-1.5 py-0.5 text-[10px] text-[#c8cedd]"
                              title={participant.listName}
                            >
                              {participant.listName}
                            </span>
                          ))}
                          {j.participants.length > 6 ? (
                            <span className="inline-flex items-center rounded-md border border-[#2a3344] bg-[#1e2533] px-1.5 py-0.5 text-[10px] text-[#8b95a8]">
                              +{j.participants.length - 6}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-3 shrink-0">
                      <Link
                        href={`/app/jam/session/${j.sessionId}`}
                        className="inline-flex rounded-md px-1 py-0.5 text-xs font-semibold text-[#6ee7b7] transition-[transform,filter,color] duration-120 hover:text-[#a7f3d0] active:scale-[0.98] active:brightness-90"
                      >
                        {pt ? "Abrir jam" : "Open jam"}
                      </Link>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}

        {activities.length > 0 && hasMore ? (
          <div ref={sentinelRef} className="mx-auto mt-4 h-12 max-w-7xl" aria-hidden />
        ) : null}
        {loadError ? (
          <p className="mt-2 text-center text-xs text-[#fca5a5]">{loadError}</p>
        ) : null}
        {loadingMore ? (
          <p className="mt-2 text-center text-xs text-[#8b95a8]">{pt ? "Carregando…" : "Loading…"}</p>
        ) : null}
        {activities.length > 0 && !hasMore && !loadingMore ? (
          <p className="mt-2 text-center text-[10px] uppercase tracking-wide text-[#6b7280]">
            {pt ? "Fim das atividades" : "End of activities"}
          </p>
        ) : null}
      </section>
    </main>
  );
}
