import { useState } from "react";
import { MintSlatePanelButton } from "@/components/buttons/MintSlatePanelButton";
import { ShowWhen } from "@/components/conditional";
import { SongLanguageSelect, type SongLanguage } from "@/components/inputs/song-language-select";
import { TitleField } from "@/components/inputs/title-field";
import { UrlField } from "@/components/inputs/url-field";
import { validatedHintClass } from "@/components/inputs/field-styles";
import type { AppLocale } from "@/lib/i18n/locales";

type SongCatalogCardProps = {
  locale: AppLocale;
  id: string;
  title: string;
  artist: string;
  language: SongLanguage;
  languageLabel: string;
  lyricsUrl?: string;
  listenUrl?: string;
  canEdit: boolean;
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
  canEdit,
  isInRepertoire,
  onSaveSong,
  onToggleRepertoire,
}: SongCatalogCardProps) {
  const pt = locale === "pt";
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftArtist, setDraftArtist] = useState(artist);
  const [draftLanguage, setDraftLanguage] = useState<SongLanguage>(language);
  const [draftLyricsUrl, setDraftLyricsUrl] = useState(lyricsUrl ?? "");
  const [draftListenUrl, setDraftListenUrl] = useState(listenUrl ?? "");
  const [editError, setEditError] = useState<string | null>(null);
  const [isAddingToRepertoire, setIsAddingToRepertoire] = useState(false);
  const [addResult, setAddResult] = useState<{ text: string; kind: "success" | "error" } | null>(null);

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

  return (
    <li className="relative rounded-lg border border-[#2a3344] bg-[#1a2230] p-3 sm:flex sm:items-center sm:justify-between sm:gap-3">
      <button
        type="button"
        onClick={toggleRepertoire}
        disabled={isAddingToRepertoire}
        aria-label={
          isAddingToRepertoire
            ? pt
              ? "Salvando estado do repertório"
              : "Saving repertoire state"
            : isInRepertoire
              ? pt
                ? "Remover do repertório"
                : "Remove from repertoire"
              : pt
                ? "Adicionar ao repertório"
                : "Add to repertoire"
        }
        title={
          isAddingToRepertoire
            ? pt
              ? "Salvando..."
              : "Saving..."
            : isInRepertoire
              ? pt
                ? "Remover do repertório"
                : "Remove from repertoire"
              : pt
                ? "Adicionar ao repertório"
                : "Add to repertoire"
        }
        className="absolute right-2 top-2 rounded-md border border-[#3a465c] bg-[#253045] p-1.5 text-[#dbe3f1] shadow-[0_2px_8px_rgba(0,0,0,0.25)] transition hover:border-[#6ee7b7] hover:text-[#ffffff] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isAddingToRepertoire ? (
          <span className="block h-4 w-4 text-[10px] font-bold leading-4">...</span>
        ) : isInRepertoire ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
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
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        )}
      </button>
      <ShowWhen when={!isEditing}>
        <div className="min-w-0 pr-8">
          <p className="truncate text-sm font-semibold text-[#e8ecf4]">{title}</p>
          <p className="truncate text-xs text-[#8b95a8]">
            {artist} · {languageLabel}
          </p>
        </div>
      </ShowWhen>
      <ShowWhen when={!isEditing}>
        <div className="mt-2 flex flex-wrap gap-2 sm:mt-0">
          <ShowWhen when={canEdit}>
            <button
              type="button"
              onClick={openEditor}
              className="rounded-md border border-[#2a3344] px-2 py-1 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
            >
              {pt ? "Editar" : "Edit"}
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
      </ShowWhen>
      <ShowWhen when={!isEditing && !!addResult}>
        <p className={`mt-2 text-xs ${addResult?.kind === "success" ? "text-[#86efac]" : "text-[#fca5a5]"}`}>
          {addResult?.text}
        </p>
      </ShowWhen>
      <ShowWhen when={isEditing}>
        <form onSubmit={submitEdit} className="mt-1 w-full space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <TitleField label={pt ? "Título" : "Title"} value={draftTitle} onChange={setDraftTitle} />
            <TitleField label={pt ? "Artista" : "Artist"} value={draftArtist} onChange={setDraftArtist} />
            <UrlField label={pt ? "Letra (URL)" : "Lyrics (URL)"} value={draftLyricsUrl} onChange={setDraftLyricsUrl} />
            <UrlField label={pt ? "Ouvir (URL)" : "Listen (URL)"} value={draftListenUrl} onChange={setDraftListenUrl} />
          </div>
          <SongLanguageSelect value={draftLanguage} onChange={setDraftLanguage} />
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
    </li>
  );
}
