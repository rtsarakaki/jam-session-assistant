import { useState } from "react";
import { MintSlatePanelButton } from "@/components/buttons/MintSlatePanelButton";
import { ShowWhen } from "@/components/conditional";
import { SongLanguageSelect, type SongLanguage } from "@/components/inputs/song-language-select";
import { TitleField } from "@/components/inputs/title-field";
import { UrlField } from "@/components/inputs/url-field";
import { validatedHintClass } from "@/components/inputs/field-styles";

type SongCatalogCardProps = {
  id: string;
  title: string;
  artist: string;
  language: SongLanguage;
  languageLabel: string;
  lyricsUrl?: string;
  listenUrl?: string;
  canEdit: boolean;
  onSaveSong: (input: {
    songId: string;
    title: string;
    artist: string;
    language: SongLanguage;
    lyricsUrl?: string;
    listenUrl?: string;
  }) => Promise<string | null>;
};

/** Row card for each song in the catalog list. */
export function SongCatalogCard({
  id,
  title,
  artist,
  language,
  languageLabel,
  lyricsUrl,
  listenUrl,
  canEdit,
  onSaveSong,
}: SongCatalogCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftArtist, setDraftArtist] = useState(artist);
  const [draftLanguage, setDraftLanguage] = useState<SongLanguage>(language);
  const [draftLyricsUrl, setDraftLyricsUrl] = useState(lyricsUrl ?? "");
  const [draftListenUrl, setDraftListenUrl] = useState(listenUrl ?? "");
  const [editError, setEditError] = useState<string | null>(null);

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

  return (
    <li className="rounded-lg border border-[#2a3344] bg-[#1a2230] p-3 sm:flex sm:items-center sm:justify-between sm:gap-3">
      <ShowWhen when={!isEditing}>
        <div className="min-w-0">
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
              Edit
            </button>
          </ShowWhen>
          <ShowWhen when={!!lyricsUrl}>
            <a
              href={lyricsUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-[#2a3344] px-2 py-1 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
            >
              Lyrics
            </a>
          </ShowWhen>
          <ShowWhen when={!!listenUrl}>
            <a
              href={listenUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-[#2a3344] px-2 py-1 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
            >
              Listen
            </a>
          </ShowWhen>
          <MintSlatePanelButton variant="slate" className="w-auto px-3 py-1 text-xs">
            Add to repertoire
          </MintSlatePanelButton>
        </div>
      </ShowWhen>
      <ShowWhen when={isEditing}>
        <form onSubmit={submitEdit} className="mt-1 w-full space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <TitleField label="Title" value={draftTitle} onChange={setDraftTitle} />
            <TitleField label="Artist" value={draftArtist} onChange={setDraftArtist} />
            <UrlField label="Lyrics (URL)" value={draftLyricsUrl} onChange={setDraftLyricsUrl} />
            <UrlField label="Listen (URL)" value={draftListenUrl} onChange={setDraftListenUrl} />
          </div>
          <SongLanguageSelect value={draftLanguage} onChange={setDraftLanguage} />
          <ShowWhen when={!!editError}>
            <p className={validatedHintClass}>{editError}</p>
          </ShowWhen>
          <div className="flex gap-2">
            <MintSlatePanelButton variant="mint" type="submit" className="w-auto px-3 py-1 text-xs">
              Save
            </MintSlatePanelButton>
            <MintSlatePanelButton
              variant="slate"
              type="button"
              className="w-auto px-3 py-1 text-xs"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </MintSlatePanelButton>
          </div>
        </form>
      </ShowWhen>
    </li>
  );
}
