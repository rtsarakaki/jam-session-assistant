"use client";

import { useEffect, useMemo, useState } from "react";
import { MintSlatePanelButton } from "@/components/buttons/MintSlatePanelButton";
import { PanelTabButton } from "@/components/buttons/PanelTabButton";
import { SongCatalogTab } from "@/app/(private)/app/songs/SongCatalogTab";
import { SongRegisterTab } from "@/app/(private)/app/songs/SongRegisterTab";
import { addToRepertoireAction, removeFromRepertoireAction } from "@/lib/actions/repertoire-actions";
import { createSongAction } from "@/lib/actions/songs-actions";
import type { CreateSongActionResult } from "@/lib/actions/songs-actions";
import { deleteSongAction, updateSongAction } from "@/lib/actions/songs-actions";
import { ShowWhen } from "@/components/conditional";
import { getSongLanguageLabel, isSongLanguage, type SongLanguage } from "@/components/inputs/song-language-select";
import { validatedHintClass } from "@/components/inputs/field-styles";
import type { AppLocale } from "@/lib/i18n/locales";
import type { SongCatalogItem } from "@/lib/platform/songs-service";

type CatalogSong = {
  id: string;
  title: string;
  artist: string;
  language: SongLanguage;
  lyricsUrl?: string;
  listenUrl?: string;
  karaokeUrl?: string;
  musiciansInRepertoire: number;
  playSessionsCount: number;
  coverGalleryPostCount: number;
  coverGalleryArtistPostCount: number;
  canEdit: boolean;
  canEditLinks: boolean;
};

type Tab = "catalog" | "register";
type CatalogGrouping = "artist" | "title";

type RegisterState = {
  title: string;
  artist: string;
  lyricsUrl: string;
  listenUrl: string;
  karaokeUrl: string;
  language: SongLanguage;
};

const emptyForm: RegisterState = {
  title: "",
  artist: "",
  lyricsUrl: "",
  listenUrl: "",
  karaokeUrl: "",
  language: "en",
};

const abcLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function sanitizeUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

function artistLetter(artist: string): string {
  const normalized = artist.trim().toUpperCase();
  const first = normalized[0];
  return first && first >= "A" && first <= "Z" ? first : "#";
}

function songGroupingLetter(song: CatalogSong, grouping: CatalogGrouping): string {
  return grouping === "artist" ? artistLetter(song.artist) : artistLetter(song.title);
}

function normalizeSongTitle(value: string): string {
  return value.trim().toLowerCase();
}

function toCatalogSong(item: SongCatalogItem): CatalogSong {
  const normalizedLanguage = (item.language || "en").toLowerCase();
  const language = isSongLanguage(normalizedLanguage) ? normalizedLanguage : "en";
  return {
    id: item.id,
    title: item.title,
    artist: item.artist,
    language,
    lyricsUrl: item.lyricsUrl ?? undefined,
    listenUrl: item.listenUrl ?? undefined,
    karaokeUrl: item.karaokeUrl ?? undefined,
    musiciansInRepertoire: item.musiciansInRepertoire,
    playSessionsCount: item.playSessionsCount,
    coverGalleryPostCount: item.coverGalleryPostCount,
    coverGalleryArtistPostCount: item.coverGalleryArtistPostCount,
    canEdit: item.canEdit,
    canEditLinks: item.canEditLinks,
  };
}

type SongsPanelProps = {
  locale: AppLocale;
  initialSongs: SongCatalogItem[];
  initialRepertoireLinks: Array<{ songId: string; repertoireEntryId: string }>;
};

export function SongsPanel({ locale, initialSongs, initialRepertoireLinks }: SongsPanelProps) {
  const pt = locale === "pt";
  const [tab, setTab] = useState<Tab>("catalog");
  const [songs, setSongs] = useState<CatalogSong[]>(() => initialSongs.map(toCatalogSong));
  const [selectedLetter, setSelectedLetter] = useState<string>("ALL");
  const [catalogGrouping, setCatalogGrouping] = useState<CatalogGrouping>("artist");
  const [onlyNotInRepertoire, setOnlyNotInRepertoire] = useState(false);
  const [form, setForm] = useState<RegisterState>(emptyForm);
  const [formError, setFormError] = useState<string>("");
  const [formSuccess, setFormSuccess] = useState<string>("");
  const [isSubmittingNewSong, setIsSubmittingNewSong] = useState(false);
  const [duplicateTitleMatches, setDuplicateTitleMatches] = useState<CatalogSong[] | null>(null);
  const [repertoireEntryBySongId, setRepertoireEntryBySongId] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialRepertoireLinks.map((l) => [l.songId, l.repertoireEntryId])),
  );

  /** Deep link from notifications: `/app/songs#song-{uuid}` */
  useEffect(() => {
    function scrollToHashedSong() {
      const m = /^#song-([0-9a-f-]{36})$/i.exec(window.location.hash);
      if (!m) return;
      const songId = m[1];
      if (!songs.some((s) => s.id === songId)) return;
      setTab("catalog");
      requestAnimationFrame(() => {
        document.getElementById(`song-${songId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
    scrollToHashedSong();
    window.addEventListener("hashchange", scrollToHashedSong);
    return () => window.removeEventListener("hashchange", scrollToHashedSong);
  }, [songs]);

  const filteredSongs = useMemo(
    () => (onlyNotInRepertoire ? songs.filter((s) => !repertoireEntryBySongId[s.id]) : songs),
    [onlyNotInRepertoire, repertoireEntryBySongId, songs],
  );

  const sortedSongs = useMemo(
    () =>
      [...filteredSongs].sort((a, b) => {
        if (catalogGrouping === "title") {
          const titleCmp = a.title.localeCompare(b.title);
          return titleCmp !== 0 ? titleCmp : a.artist.localeCompare(b.artist);
        }
        const artistCmp = a.artist.localeCompare(b.artist);
        return artistCmp !== 0 ? artistCmp : a.title.localeCompare(b.title);
      }),
    [filteredSongs, catalogGrouping],
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, CatalogSong[]>();
    for (const song of sortedSongs) {
      const letter = songGroupingLetter(song, catalogGrouping);
      const existing = groups.get(letter);
      if (existing) existing.push(song);
      else groups.set(letter, [song]);
    }
    return groups;
  }, [sortedSongs, catalogGrouping]);

  const visibleLetters = useMemo(() => new Set(grouped.keys()), [grouped]);

  const visibleGroups = useMemo(() => {
    if (selectedLetter === "ALL") return [...grouped.entries()];
    const songsForLetter = grouped.get(selectedLetter);
    return songsForLetter ? [[selectedLetter, songsForLetter] as const] : [];
  }, [grouped, selectedLetter]);

  const artistSuggestions = useMemo(() => {
    return [...new Set(songs.map((s) => s.artist.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [songs]);

  function catalogSongsWithSameTitle(title: string): CatalogSong[] {
    const key = normalizeSongTitle(title);
    if (!key) return [];
    return songs.filter((s) => normalizeSongTitle(s.title) === key);
  }

  async function runRegisterCatalogSong(confirmSameTitle: boolean) {
    if (isSubmittingNewSong) return;
    setFormError("");
    setFormSuccess("");

    const title = form.title.trim();
    const artist = form.artist.trim();
    if (!title || !artist) {
      setFormError(pt ? "Título e artista são obrigatórios." : "Title and artist are required.");
      return;
    }

    const lyricsUrl = sanitizeUrl(form.lyricsUrl);
    const listenUrl = sanitizeUrl(form.listenUrl);
    const karaokeUrl = sanitizeUrl(form.karaokeUrl);
    if (form.lyricsUrl.trim() && !lyricsUrl) {
      setFormError(pt ? "A URL da letra deve começar com http:// ou https://" : "Lyrics URL must start with http:// or https://");
      return;
    }
    if (form.listenUrl.trim() && !listenUrl) {
      setFormError(pt ? "A URL para ouvir deve começar com http:// ou https://" : "Listen URL must start with http:// or https://");
      return;
    }
    if (form.karaokeUrl.trim() && !karaokeUrl) {
      setFormError(pt ? "A URL de karaoke deve começar com http:// ou https://" : "Karaoke URL must start with http:// or https://");
      return;
    }

    const dupes = catalogSongsWithSameTitle(title);
    if (dupes.length > 0 && !confirmSameTitle) {
      setDuplicateTitleMatches(dupes);
      return;
    }
    setDuplicateTitleMatches(null);

    setIsSubmittingNewSong(true);
    try {
      const created: CreateSongActionResult = await createSongAction({
        title,
        artist,
        language: form.language,
        lyricsUrl,
        listenUrl,
        karaokeUrl,
      });
      if (created.error) {
        setFormError(created.error);
        return;
      }
      const createdSong = created.song;
      if (createdSong !== undefined) {
        setSongs((prev) => [...prev, toCatalogSong(createdSong)]);
      }
      setForm(emptyForm);
      setFormSuccess(pt ? `"${title}" de ${artist} adicionada ao catálogo.` : `"${title}" by ${artist} added to catalog.`);
      setTab("catalog");
      setSelectedLetter(
        songGroupingLetter(
          {
            id: "tmp",
            title,
            artist,
            language: form.language,
            musiciansInRepertoire: 0,
            playSessionsCount: 0,
            coverGalleryPostCount: 0,
            coverGalleryArtistPostCount: 0,
            canEdit: true,
            canEditLinks: true,
          },
          catalogGrouping,
        ),
      );
    } finally {
      setIsSubmittingNewSong(false);
    }
  }

  async function submitNewSong(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await runRegisterCatalogSong(false);
  }

  async function submitSongEdit(input: {
    songId: string;
    title: string;
    artist: string;
    language: SongLanguage;
    lyricsUrl?: string;
    listenUrl?: string;
    karaokeUrl?: string;
  }): Promise<string | null> {
    const updated = await updateSongAction({
      songId: input.songId,
      title: input.title,
      artist: input.artist,
      language: input.language,
      lyricsUrl: input.lyricsUrl,
      listenUrl: input.listenUrl,
      karaokeUrl: input.karaokeUrl,
    });
    if (updated.error) return updated.error;
    if (updated.song) {
      const mapped = toCatalogSong(updated.song);
      setSongs((prev) => prev.map((s) => (s.id === mapped.id ? mapped : s)));
    }
    return null;
  }

  async function toggleSongInRepertoire(songId: string): Promise<{ error: string | null; message: string; inRepertoire: boolean }> {
    const existingEntryId = repertoireEntryBySongId[songId];
    if (existingEntryId) {
      const removed = await removeFromRepertoireAction({ repertoireEntryId: existingEntryId });
      if (removed.error) {
        return { error: removed.error, message: removed.error, inRepertoire: true };
      }
      setRepertoireEntryBySongId((prev) => {
        const next = { ...prev };
        delete next[songId];
        return next;
      });
      setSongs((prev) =>
        prev.map((s) =>
          s.id === songId
            ? { ...s, musiciansInRepertoire: Math.max(0, s.musiciansInRepertoire - 1) }
            : s,
        ),
      );
      return { error: null, message: pt ? "Removida do repertório." : "Removed from repertoire.", inRepertoire: false };
    }

    const added = await addToRepertoireAction({ songId, level: "ADVANCED" });
    if (added.error) {
      return { error: added.error, message: added.error, inRepertoire: false };
    }
    const repertoireEntryId = added.repertoireEntryId;
    if (repertoireEntryId) {
      setRepertoireEntryBySongId((prev) => ({ ...prev, [songId]: repertoireEntryId }));
      setSongs((prev) =>
        prev.map((s) => (s.id === songId ? { ...s, musiciansInRepertoire: s.musiciansInRepertoire + 1 } : s)),
      );
    }
    return { error: null, message: pt ? "Adicionada ao repertório." : "Added to repertoire.", inRepertoire: true };
  }

  async function deleteSongFromCatalog(input: { songId: string; title: string }): Promise<string | null> {
    const removed = await deleteSongAction({ songId: input.songId });
    if (removed.error) return removed.error;
    setSongs((prev) => prev.filter((s) => s.id !== input.songId));
    setRepertoireEntryBySongId((prev) => {
      const next = { ...prev };
      delete next[input.songId];
      return next;
    });
    return null;
  }

  return (
    <main id="app-main" className="mx-auto w-full max-w-5xl pb-8">
      <section className="rounded-2xl border border-[#2a3344] bg-[#171c26] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.22)] sm:p-5">
        <h2 className="m-0 text-xl font-semibold text-[#e8ecf4]">{pt ? "Catálogo de músicas" : "Song catalog"}</h2>
        <p className={`${validatedHintClass} mt-2`}>
          {pt ? (
            <>
              <strong>Catálogo</strong> agrupa músicas pela inicial do artista; <strong>Cadastrar</strong> adiciona uma
              nova música a esta visão. Qualquer pessoa logada pode corrigir os links de letra e ouvir; só quem cadastrou
              altera título e artista.
            </>
          ) : (
            <>
              <strong>Catalog</strong> groups songs by artist initial; <strong>Register</strong> adds a new song to this
              view. Anyone signed in can update lyrics and listen links; only whoever added the song can change its title
              and artist.
            </>
          )}
        </p>

        <div className="mt-4 flex gap-2 border-b border-[#2a3344] pb-3" role="tablist" aria-label={pt ? "Abas do catálogo" : "Catalog tabs"}>
          <PanelTabButton
            id="songs-tab-catalog"
            selected={tab === "catalog"}
            onClick={() => {
              setDuplicateTitleMatches(null);
              setTab("catalog");
            }}
            controlsId="songs-panel-catalog"
          >
            {pt ? "Catálogo" : "Catalog"}
          </PanelTabButton>
          <PanelTabButton
            id="songs-tab-register"
            selected={tab === "register"}
            onClick={() => setTab("register")}
            controlsId="songs-panel-register"
          >
            {pt ? "Cadastrar" : "Register"}
          </PanelTabButton>
        </div>

        <ShowWhen when={tab === "catalog"}>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#8b95a8]">
              {pt ? "Agrupar por inicial de" : "Group by initial of"}
            </label>
            <select
              className="rounded-md border border-[#2a3344] bg-[#1e2533] px-2 py-1 text-xs font-semibold text-[#e8ecf4]"
              value={catalogGrouping}
              onChange={(e) => {
                const next = e.target.value === "title" ? "title" : "artist";
                setCatalogGrouping(next);
                setSelectedLetter("ALL");
              }}
            >
              <option value="artist">{pt ? "Artista" : "Artist"}</option>
              <option value="title">{pt ? "Título da música" : "Song title"}</option>
            </select>
            <span className="text-xs text-[#8b95a8]">
              {pt
                ? `Agrupado pela primeira letra de ${catalogGrouping === "artist" ? "nome do artista" : "título da música"}.`
                : `Grouped by first letter of ${catalogGrouping === "artist" ? "artist name" : "song title"}.`}
            </span>
            <label className="ml-1 inline-flex items-center gap-1.5 text-xs text-[#8b95a8]">
              <input
                type="checkbox"
                checked={onlyNotInRepertoire}
                onChange={(e) => {
                  setOnlyNotInRepertoire(e.target.checked);
                  setSelectedLetter("ALL");
                }}
                className="h-3.5 w-3.5 rounded border-[#2a3344] bg-[#1e2533]"
              />
              {pt ? "Só fora do meu repertório" : "Only not in my repertoire"}
            </label>
          </div>
          <SongCatalogTab
            locale={locale}
            letters={abcLetters}
            selectedLetter={selectedLetter}
            enabledLetters={visibleLetters}
            onSelectLetter={setSelectedLetter}
            visibleGroups={visibleGroups.map(([letter, items]) => [
              letter,
              items.map((song) => ({
                ...song,
                languageLabel: getSongLanguageLabel(song.language),
                canEdit: song.canEdit,
                canEditLinks: song.canEditLinks,
                isInRepertoire: !!repertoireEntryBySongId[song.id],
              })),
            ])}
            onSaveSong={submitSongEdit}
            onToggleSongInRepertoire={toggleSongInRepertoire}
            onDeleteSongFromCatalog={deleteSongFromCatalog}
          />
        </ShowWhen>
        <ShowWhen when={tab === "register"}>
          {duplicateTitleMatches && duplicateTitleMatches.length > 0 ? (
            <div
              className="mt-4 rounded-lg border border-[color-mix(in_srgb,#fbbf24_45%,#2a3344)] bg-[color-mix(in_srgb,#fbbf24_10%,#1e2533)] px-4 py-3 text-sm"
              role="alert"
            >
              <p className="m-0 font-semibold text-[#fcd34d]">Este título já está no catálogo</p>
              <p className="mt-2 text-[#c8cedd]">
                {pt
                  ? "Outra entrada usa o mesmo título (ignorando maiúsculas/minúsculas). Você pode mudar o título ou adicionar esta música mesmo assim se for uma versão diferente."
                  : "Another entry uses the same title (case-insensitive). You can change the title or still add this song if it is a different version."}
              </p>
              <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-[#e8ecf4]">
                {duplicateTitleMatches.map((s) => (
                  <li key={s.id}>
                    <span className="font-medium">{s.title}</span>
                    <span className="text-[#8b95a8]"> - {s.artist}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <MintSlatePanelButton
                  type="button"
                  variant="slate"
                  className="min-w-32 flex-1"
                  onClick={() => setDuplicateTitleMatches(null)}
                >
                  {pt ? "Voltar" : "Back"}
                </MintSlatePanelButton>
                <MintSlatePanelButton
                  type="button"
                  variant="mint"
                  className="min-w-32 flex-1"
                  disabled={isSubmittingNewSong}
                  onClick={() => void runRegisterCatalogSong(true)}
                >
                  {isSubmittingNewSong ? (pt ? "Adicionando..." : "Adding...") : pt ? "Adicionar mesmo assim" : "Add anyway"}
                </MintSlatePanelButton>
              </div>
            </div>
          ) : null}
          <SongRegisterTab
            locale={locale}
            artistSuggestions={artistSuggestions}
            form={form}
            onChangeForm={(patch) => {
              setDuplicateTitleMatches(null);
              setForm((prev) => ({
                ...prev,
                ...patch,
                language: (patch.language ?? prev.language) as SongLanguage,
              }));
            }}
            formError={formError}
            formSuccess={formSuccess}
            onSubmit={submitNewSong}
            submitting={isSubmittingNewSong}
          />
        </ShowWhen>
      </section>
    </main>
  );
}
