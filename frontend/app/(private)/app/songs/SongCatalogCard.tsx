import Link from "next/link";
import { useState } from "react";
import { MintSlatePanelButton } from "@/components/buttons/MintSlatePanelButton";
import { ShowWhen } from "@/components/conditional";
import { SongLanguageSelect, type SongLanguage } from "@/components/inputs/song-language-select";
import { TitleField } from "@/components/inputs/title-field";
import { UrlField } from "@/components/inputs/url-field";
import { validatedHintClass } from "@/components/inputs/field-styles";
import type { AppLocale } from "@/lib/i18n/locales";
import { coverGalleryArtistHref, coverGallerySongHref } from "@/lib/navigation/cover-gallery-href";

type SongCatalogCardProps = {
  locale: AppLocale;
  id: string;
  title: string;
  artist: string;
  language: SongLanguage;
  languageLabel: string;
  lyricsUrl?: string;
  listenUrl?: string;
  musiciansInRepertoire: number;
  playSessionsCount: number;
  /** Posts counted like /app/covers for this song («Ver tudo»). */
  coverGalleryPostCount: number;
  /** Same gallery rules, summed for all catalog songs with this exact artist. */
  coverGalleryArtistPostCount: number;
  canEdit: boolean;
  canEditLinks: boolean;
  isInRepertoire: boolean;
  onSaveSong: (input: {
    songId: string;
    title: string;
    artist: string;
    language: SongLanguage;
    lyricsUrl?: string;
    listenUrl?: string;
  }) => Promise<string | null>;
  onToggleRepertoire: (songId: string) => Promise<{ error: string | null; message: string; inRepertoire: boolean }>;
  onDeleteFromCatalog: (input: { songId: string; title: string }) => Promise<string | null>;
};

/** Row card for each song in the catalog list. */
export function SongCatalogCard({
  locale,
  id,
  title,
  artist,
  language,
  languageLabel,
  lyricsUrl,
  listenUrl,
  musiciansInRepertoire,
  playSessionsCount,
  coverGalleryPostCount,
  coverGalleryArtistPostCount,
  canEdit,
  canEditLinks,
  isInRepertoire,
  onSaveSong,
  onToggleRepertoire,
  onDeleteFromCatalog,
}: SongCatalogCardProps) {
  const pt = locale === "pt";
  const linkEditOnly = !canEdit && canEditLinks;
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftArtist, setDraftArtist] = useState(artist);
  const [draftLanguage, setDraftLanguage] = useState<SongLanguage>(language);
  const [draftLyricsUrl, setDraftLyricsUrl] = useState(lyricsUrl ?? "");
  const [draftListenUrl, setDraftListenUrl] = useState(listenUrl ?? "");
  const [editError, setEditError] = useState<string | null>(null);
  const [isAddingToRepertoire, setIsAddingToRepertoire] = useState(false);
  const [addResult, setAddResult] = useState<{ text: string; kind: "success" | "error" } | null>(null);
  const [isDeletingFromCatalog, setIsDeletingFromCatalog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteDialogError, setDeleteDialogError] = useState<string | null>(null);

  async function submitEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEditError(null);
    const error = await onSaveSong({
      songId: id,
      title: draftTitle,
      artist: draftArtist,
      language: draftLanguage,
      lyricsUrl: draftLyricsUrl,
      listenUrl: draftListenUrl,
    });
    if (error) {
      setEditError(error);
      return;
    }
    setIsEditing(false);
  }

  function openEditor() {
    setDraftTitle(title);
    setDraftArtist(artist);
    setDraftLanguage(language);
    setDraftLyricsUrl(lyricsUrl ?? "");
    setDraftListenUrl(listenUrl ?? "");
    setEditError(null);
    setIsEditing(true);
  }

  async function toggleRepertoire() {
    if (isAddingToRepertoire) return;
    setIsAddingToRepertoire(true);
    setAddResult(null);
    try {
      const result = await onToggleRepertoire(id);
      setAddResult({ text: result.message, kind: result.error ? "error" : "success" });
    } finally {
      setIsAddingToRepertoire(false);
    }
  }

  async function deleteFromCatalog() {
    if (!canEdit || isDeletingFromCatalog) return;
    setIsDeletingFromCatalog(true);
    setAddResult(null);
    const error = await onDeleteFromCatalog({ songId: id, title });
    if (error) {
      setDeleteDialogError(error);
      setAddResult({ text: error, kind: "error" });
      setIsDeletingFromCatalog(false);
      return;
    }
    setDeleteDialogOpen(false);
    setDeleteConfirmText("");
    setDeleteDialogError(null);
    setIsDeletingFromCatalog(false);
  }

  return (
    <li id={`song-${id}`} className="relative scroll-mt-24 rounded-lg border border-[#2a3344] bg-[#1a2230] p-3">
      <ShowWhen when={!isEditing}>
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="min-w-0 pr-11 sm:flex-1 sm:pr-0">
            <p className="truncate text-sm font-semibold text-[#e8ecf4]">{title}</p>
            <p className="truncate text-xs text-[#8b95a8]">
              {artist} · {languageLabel}
            </p>
            <p
              className="mt-1 text-[0.65rem] leading-snug text-[#6b7588] wrap-anywhere"
              title={
                pt
                  ? "Pessoas com esta música no repertório (todo o app). «Tocada em jam» = sessões em que foi marcada como tocada."
                  : "People with this song in repertoire (whole app). “Played in jam” = sessions where it was marked as played."
              }
            >
              {pt ? (
                <>
                  <span className="tabular-nums text-[#8b95a8]">{musiciansInRepertoire}</span>{" "}
                  {musiciansInRepertoire === 1 ? "pessoa no repertório" : "pessoas no repertório"}
                  <span className="text-[#4a5568]"> · </span>
                  <span className="tabular-nums text-[#8b95a8]">{playSessionsCount}</span>{" "}
                  {playSessionsCount === 1 ? "vez tocada em jam" : "vezes tocadas em jam"}
                </>
              ) : (
                <>
                  <span className="tabular-nums text-[#8b95a8]">{musiciansInRepertoire}</span>{" "}
                  {musiciansInRepertoire === 1 ? "person in repertoire" : "people in repertoire"}
                  <span className="text-[#4a5568]"> · </span>
                  <span className="tabular-nums text-[#8b95a8]">{playSessionsCount}</span>{" "}
                  {playSessionsCount === 1 ? "time played in a jam" : "times played in jams"}
                </>
              )}
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.65rem] font-semibold">
              <Link
                href={coverGallerySongHref(id)}
                className="text-[#93c5fd] hover:text-[#bfdbfe]"
                title={
                  pt
                    ? `Vídeos no feed que entram na galeria para esta música (modo «Ver tudo»): ${coverGalleryPostCount}.`
                    : `Feed videos that appear in the gallery for this song (“See all” scope): ${coverGalleryPostCount}.`
                }
              >
                {pt ? "Vídeos desta música" : "Song videos"}
                <span className="tabular-nums font-normal text-[#6b7588]"> ({coverGalleryPostCount})</span>
              </Link>
              <span className="text-[#4a5568]" aria-hidden>
                ·
              </span>
              <Link
                href={coverGalleryArtistHref(artist)}
                className="text-[#93c5fd] hover:text-[#bfdbfe]"
                title={
                  pt
                    ? `Total na galeria para todas as músicas deste artista no catálogo (mesma regra): ${coverGalleryArtistPostCount}.`
                    : `Gallery total for all catalog songs by this artist (same rules): ${coverGalleryArtistPostCount}.`
                }
              >
                {pt ? "Vídeos do artista" : "Artist videos"}
                <span className="tabular-nums font-normal text-[#6b7588]"> ({coverGalleryArtistPostCount})</span>
              </Link>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
            <button
              type="button"
              onClick={toggleRepertoire}
              disabled={isAddingToRepertoire}
              className={`rounded-md border p-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                isInRepertoire
                  ? "border-[#6ee7b7]/45 bg-[color-mix(in_srgb,#6ee7b7_12%,transparent)] text-[#6ee7b7] hover:bg-[color-mix(in_srgb,#6ee7b7_18%,transparent)]"
                  : "border-[#2a3344] text-[#8b95a8] hover:text-[#e8ecf4]"
              }`}
              aria-label={
                isInRepertoire
                  ? pt
                    ? "Remover do repertório (não exclui do catálogo)"
                    : "Remove from repertoire (does not delete from catalog)"
                  : pt
                    ? "Adicionar ao repertório"
                    : "Add to repertoire"
              }
              title={
                isInRepertoire
                  ? pt
                    ? "Remover do repertório (não exclui do catálogo)"
                    : "Remove from repertoire (does not delete from catalog)"
                  : pt
                    ? "Adicionar ao repertório"
                    : "Add to repertoire"
              }
            >
              {isAddingToRepertoire ? (
                <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/35 border-t-current" aria-hidden />
              ) : isInRepertoire ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8 12h8" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
              )}
            </button>
            <ShowWhen when={canEdit || canEditLinks}>
              <button
                type="button"
                onClick={openEditor}
                className="rounded-md border border-[#2a3344] p-1.5 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
                aria-label={canEdit ? (pt ? "Editar música" : "Edit song") : pt ? "Editar links da música" : "Edit song links"}
                title={canEdit ? (pt ? "Editar música" : "Edit song") : pt ? "Editar links da música" : "Edit song links"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
            </ShowWhen>
            <ShowWhen when={canEdit}>
              <button
                type="button"
                onClick={() => {
                  setDeleteDialogOpen(true);
                  setDeleteConfirmText("");
                  setDeleteDialogError(null);
                }}
                disabled={isDeletingFromCatalog}
                className="rounded-md border border-[#fca5a5] p-1.5 text-xs font-semibold text-[#fca5a5] hover:text-[#fecaca] disabled:opacity-70"
                aria-label={pt ? "Excluir do catálogo" : "Delete from catalog"}
                title={pt ? "Excluir do catálogo" : "Delete from catalog"}
              >
                {isDeletingFromCatalog ? (
                  <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/35 border-t-current" aria-hidden />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                  </svg>
                )}
              </button>
            </ShowWhen>
            <ShowWhen when={!!lyricsUrl}>
              <a
                href={lyricsUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-[#2a3344] px-2 py-1 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
              >
                {pt ? "Letra" : "Lyrics"}
              </a>
            </ShowWhen>
            <ShowWhen when={!!listenUrl}>
              <a
                href={listenUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-[#2a3344] px-2 py-1 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
              >
                {pt ? "Ouvir" : "Listen"}
              </a>
            </ShowWhen>
          </div>
        </div>
      </ShowWhen>
      <ShowWhen when={!isEditing && !!addResult}>
        <p className={`mt-2 text-xs ${addResult?.kind === "success" ? "text-[#86efac]" : "text-[#fca5a5]"}`}>
          {addResult?.text}
        </p>
      </ShowWhen>
      <ShowWhen when={isEditing}>
        <form onSubmit={submitEdit} className="mt-1 w-full min-w-0 space-y-3">
          {linkEditOnly ? (
            <p className="text-xs leading-relaxed text-[#8b95a8]">
              {pt
                ? "Só o autor do cadastro pode alterar título, artista e idioma. Ajuste aqui os links de letra e ouvir."
                : "Only whoever added this song can change the title, artist, and language. Update the lyrics and listen links below."}
            </p>
          ) : null}
          {linkEditOnly ? (
            <div className="grid gap-2 rounded-lg border border-[#2a3344] bg-[#141a24] p-3 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8b95a8]">{pt ? "Título" : "Title"}</p>
                <p className="mt-0.5 text-sm text-[#e8ecf4]">{draftTitle}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8b95a8]">{pt ? "Artista" : "Artist"}</p>
                <p className="mt-0.5 text-sm text-[#e8ecf4]">{draftArtist}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8b95a8]">{pt ? "Idioma" : "Language"}</p>
                <p className="mt-0.5 text-sm text-[#e8ecf4]">{languageLabel}</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <TitleField label={pt ? "Título" : "Title"} value={draftTitle} onChange={setDraftTitle} />
              <TitleField label={pt ? "Artista" : "Artist"} value={draftArtist} onChange={setDraftArtist} />
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <UrlField label={pt ? "Letra (URL)" : "Lyrics (URL)"} value={draftLyricsUrl} onChange={setDraftLyricsUrl} />
            <UrlField label={pt ? "Ouvir (URL)" : "Listen (URL)"} value={draftListenUrl} onChange={setDraftListenUrl} />
          </div>
          {linkEditOnly ? null : <SongLanguageSelect value={draftLanguage} onChange={setDraftLanguage} />}
          <ShowWhen when={!!editError}>
            <p className={validatedHintClass}>{editError}</p>
          </ShowWhen>
          <div className="flex gap-2">
            <MintSlatePanelButton variant="mint" type="submit" className="w-auto px-3 py-1 text-xs">
              {pt ? "Salvar" : "Save"}
            </MintSlatePanelButton>
            <MintSlatePanelButton
              variant="slate"
              type="button"
              className="w-auto px-3 py-1 text-xs"
              onClick={() => setIsEditing(false)}
            >
              {pt ? "Cancelar" : "Cancel"}
            </MintSlatePanelButton>
          </div>
        </form>
      </ShowWhen>
      <ShowWhen when={deleteDialogOpen}>
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#2a3344] bg-[#171c26] p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#fca5a5]">
              {pt ? "Excluir música do catálogo" : "Delete song from catalog"}
            </h3>
            <p className="mt-2 text-sm text-[#c8cedd]">
              {pt
                ? "Para confirmar, copie o nome abaixo e cole no campo de confirmação."
                : "To confirm, copy the name below and paste it in the confirmation field."}
            </p>
            <div className="mt-3 rounded-md border border-[#2a3344] bg-[#111722] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8b95a8]">{pt ? "Nome da música" : "Song name"}</p>
              <div className="mt-2 flex gap-2">
                <input
                  value={title}
                  readOnly
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-md border border-[#2a3344] bg-[#1e2533] px-2 py-1.5 text-xs text-[#e8ecf4]"
                />
                <button
                  type="button"
                  className="rounded-md border border-[#2a3344] px-2 py-1.5 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
                  onClick={() => void navigator.clipboard.writeText(title)}
                >
                  {pt ? "Copiar" : "Copy"}
                </button>
              </div>
            </div>
            <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wide text-[#8b95a8]">
              {pt ? "Digite o nome para confirmar" : "Type the name to confirm"}
            </label>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-[#2a3344] bg-[#1e2533] px-3 py-2 text-sm text-[#e8ecf4]"
              placeholder={pt ? "Cole o nome exato aqui" : "Paste the exact name here"}
            />
            {deleteDialogError ? <p className="mt-2 text-xs text-[#fca5a5]">{deleteDialogError}</p> : null}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <MintSlatePanelButton
                type="button"
                variant="slate"
                className="w-auto px-3 py-1 text-xs"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setDeleteConfirmText("");
                  setDeleteDialogError(null);
                }}
              >
                {pt ? "Cancelar" : "Cancel"}
              </MintSlatePanelButton>
              <button
                type="button"
                disabled={isDeletingFromCatalog || deleteConfirmText.trim() !== title.trim()}
                className="rounded-md border border-[#fca5a5] bg-[color-mix(in_srgb,#f87171_14%,#1e2533)] px-3 py-1 text-xs font-semibold text-[#fca5a5] hover:bg-[color-mix(in_srgb,#f87171_22%,#1e2533)] disabled:opacity-60"
                onClick={() => void deleteFromCatalog()}
              >
                {isDeletingFromCatalog ? (pt ? "Excluindo..." : "Deleting...") : pt ? "Excluir do catálogo" : "Delete from catalog"}
              </button>
            </div>
          </div>
        </div>
      </ShowWhen>
    </li>
  );
}
