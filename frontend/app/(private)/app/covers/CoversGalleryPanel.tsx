"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { addCoverGalleryCardAction, deleteCoverGalleryCardAction } from "@/lib/actions/cover-gallery-actions";
import { MintSlatePanelButton } from "@/components/buttons/MintSlatePanelButton";
import { ShowWhen } from "@/components/conditional";
import type { AppLocale } from "@/lib/i18n/locales";
import type { CoverGalleryCardItem, CoverGalleryPageModel } from "@/lib/platform/cover-gallery-service";
import { coverGalleryArtistHref, coverGalleryArtistWithSongHref, coverGallerySongHref } from "@/lib/navigation/cover-gallery-href";

type CoversGalleryPanelProps = {
  locale: AppLocale;
  myUserId: string;
  model: CoverGalleryPageModel;
};

export function CoversGalleryPanel({ locale, myUserId, model }: CoversGalleryPanelProps) {
  const pt = locale === "pt";
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formSongId, setFormSongId] = useState<string>(() => defaultFormSongId(model));
  const [imageUrl, setImageUrl] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const headline = useMemo(() => {
    if (model.kind === "song") {
      return pt ? "Galeria de covers" : "Cover gallery";
    }
    if (model.kind === "artist") {
      return pt ? "Covers do artista" : "Artist covers";
    }
    return pt ? "Galeria de covers" : "Cover gallery";
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
    return pt ? "Escolha uma música ou um artista para ver os covers." : "Pick a song or artist to browse covers.";
  }, [model, pt]);

  function onFilterSongChange(songId: string) {
    if (model.kind !== "artist") return;
    if (!songId) {
      router.push(coverGalleryArtistHref(model.artist));
      return;
    }
    router.push(coverGalleryArtistWithSongHref(model.artist, songId));
  }

  async function onAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setFormError(null);
    const targetSongId =
      model.kind === "song"
        ? model.song.id
        : model.kind === "artist" && model.filteredSongId
          ? model.filteredSongId
          : formSongId;
    startTransition(async () => {
      const res = await addCoverGalleryCardAction({
        songId: targetSongId,
        imageUrl,
        note: note.trim() || null,
      });
      if (res.error) {
        setFormError(res.error);
        return;
      }
      setImageUrl("");
      setNote("");
      router.refresh();
    });
  }

  async function onDelete(cardId: string) {
    if (pending) return;
    startTransition(async () => {
      const res = await deleteCoverGalleryCardAction(cardId);
      if (res.error) {
        setFormError(res.error);
        return;
      }
      router.refresh();
    });
  }

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
              , do feed ou de um post no canal — os links levam para a galeria da música ou do artista.
            </>
          ) : (
            <>
              Open this page from a song in the{" "}
              <Link href="/app/songs" className="font-semibold text-[#6ee7b7] hover:text-[#a7f3d0]">
                catalog
              </Link>
              , the feed, or a channel post — links open the song or artist gallery.
            </>
          )}
        </p>
      ) : null}

      {model.kind === "song" ? (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
          <Link className="text-[#93c5fd] hover:text-[#bfdbfe]" href={coverGalleryArtistHref(model.song.artist)}>
            {pt ? "Ver todos os covers deste artista" : "All covers for this artist"}
          </Link>
          <span className="text-[#4a5568]">·</span>
          <Link className="text-[#93c5fd] hover:text-[#bfdbfe]" href="/app/songs">
            {pt ? "Catálogo" : "Song catalog"}
          </Link>
        </div>
      ) : null}

      {model.kind === "artist" ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold">
            <Link className="text-[#93c5fd] hover:text-[#bfdbfe]" href="/app/songs">
              {pt ? "Catálogo" : "Song catalog"}
            </Link>
            {model.filteredSongId ? (
              <>
                <span className="text-[#4a5568]">·</span>
                <Link className="text-[#93c5fd] hover:text-[#bfdbfe]" href={coverGalleryArtistHref(model.artist)}>
                  {pt ? "Ver todos os covers do artista" : "Show all artist covers"}
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

      {model.kind === "song" ||
      (model.kind === "artist" && (model.filteredSongId || model.songsForFilter.length > 0)) ? (
        <section className="mt-5 rounded-xl border border-[#2a3344] bg-[#111722] p-4">
          <h3 className="m-0 text-xs font-semibold uppercase tracking-wide text-[#6ee7b7]">
            {pt ? "Adicionar cover" : "Add a cover"}
          </h3>
          <p className="mt-1 text-[0.7rem] leading-snug text-[#8b95a8]">
            {pt
              ? "Cole um link público (https) para a imagem. Só você pode remover o que enviar."
              : "Paste a public image URL (https). You can only delete cards you uploaded."}
          </p>
          <form onSubmit={onAddSubmit} className="mt-3 grid gap-2">
            {model.kind === "artist" && !model.filteredSongId ? (
              <label className="grid gap-1 text-[0.7rem] font-semibold text-[#8b95a8]">
                {pt ? "Música do catálogo" : "Catalog song"}
                <select
                  value={formSongId}
                  onChange={(e) => setFormSongId(e.target.value)}
                  required
                  className="rounded-md border border-[#2a3344] bg-[#0f1218] px-2 py-1.5 text-[0.8rem] text-[#e8ecf4]"
                >
                  {model.songsForFilter.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="grid gap-1 text-[0.7rem] font-semibold text-[#8b95a8]">
              {pt ? "URL da imagem" : "Image URL"}
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                required
                placeholder="https://"
                className="rounded-md border border-[#2a3344] bg-[#0f1218] px-2 py-1.5 text-[0.8rem] text-[#e8ecf4]"
              />
            </label>
            <label className="grid gap-1 text-[0.7rem] font-semibold text-[#8b95a8]">
              {pt ? "Nota (opcional)" : "Note (optional)"}
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                className="rounded-md border border-[#2a3344] bg-[#0f1218] px-2 py-1.5 text-[0.8rem] text-[#e8ecf4]"
              />
            </label>
            <MintSlatePanelButton type="submit" variant="mint" disabled={pending} className="mt-1 w-fit px-4">
              {pending ? (pt ? "Enviando…" : "Sending…") : pt ? "Publicar cover" : "Publish cover"}
            </MintSlatePanelButton>
            <ShowWhen when={!!formError}>
              <p className="m-0 text-[0.7rem] text-[#fca5a5]" role="alert">
                {formError}
              </p>
            </ShowWhen>
          </form>
        </section>
      ) : null}

      {model.kind === "song" || model.kind === "artist" ? (
        <ul className="mt-5 m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {model.cards.length === 0 ? (
            <li className="col-span-full rounded-xl border border-dashed border-[#2a3344] bg-[#111722] p-6 text-center text-sm text-[#8b95a8]">
              {pt ? "Ainda não há covers aqui. Seja o primeiro a publicar." : "No covers yet. Be the first to add one."}
            </li>
          ) : (
            model.cards.map((c) => (
              <CoverCard key={c.id} card={c} locale={locale} myUserId={myUserId} onDelete={onDelete} pending={pending} />
            ))
          )}
        </ul>
      ) : null}
    </main>
  );
}

function defaultFormSongId(model: CoverGalleryPageModel): string {
  if (model.kind === "song") return model.song.id;
  if (model.kind === "artist" && model.filteredSongId) return model.filteredSongId;
  if (model.kind === "artist" && model.songsForFilter[0]) return model.songsForFilter[0].id;
  return "";
}

function CoverCard({
  card,
  locale,
  myUserId,
  onDelete,
  pending,
}: {
  card: CoverGalleryCardItem;
  locale: AppLocale;
  myUserId: string;
  onDelete: (id: string) => void;
  pending: boolean;
}) {
  const pt = locale === "pt";
  const mine = card.createdBy === myUserId;
  return (
    <li className="overflow-hidden rounded-xl border border-[#2a3344] bg-[#171c26]">
      <div className="relative aspect-4/3 w-full bg-[#0f1218]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={card.imageUrl} alt="" className="h-full w-full object-contain" loading="lazy" />
      </div>
      <div className="p-2.5">
        <p className="m-0 truncate text-[0.7rem] font-semibold text-[#e8ecf4]" title={card.songTitle}>
          {card.songTitle}
        </p>
        <p className="m-0 truncate text-[0.65rem] text-[#8b95a8]">{card.songArtist}</p>
        {card.note ? (
          <p className="mt-1 line-clamp-3 text-[0.65rem] leading-snug text-[#b8c0d0]">{card.note}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <Link href={coverGallerySongHref(card.songId)} className="text-[0.65rem] font-semibold text-[#93c5fd] hover:text-[#bfdbfe]">
            {pt ? "Música" : "Song"}
          </Link>
          {mine ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => onDelete(card.id)}
              className="rounded-md border border-[#2a3344] px-2 py-0.5 text-[0.65rem] font-semibold text-[#fca5a5]/90 hover:bg-[color-mix(in_srgb,#f87171_12%,#1e2533)] disabled:opacity-50"
            >
              {pt ? "Remover" : "Remove"}
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
