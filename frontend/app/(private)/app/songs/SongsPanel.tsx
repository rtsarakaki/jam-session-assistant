"use client";

import { useMemo, useState } from "react";
import { MintSlatePanelButton } from "@/components/buttons/MintSlatePanelButton";
import { PanelTabButton } from "@/components/buttons/PanelTabButton";
import { SongCatalogTab } from "@/app/(private)/app/songs/SongCatalogTab";
import { SongRegisterTab } from "@/app/(private)/app/songs/SongRegisterTab";
import { addToRepertoireAction, removeFromRepertoireAction } from "@/lib/actions/repertoire-actions";
import { createSongAction } from "@/lib/actions/songs-actions";
import type { CreateSongActionResult } from "@/lib/actions/songs-actions";
import { updateSongAction } from "@/lib/actions/songs-actions";
import { ShowWhen } from "@/components/conditional";
import { getSongLanguageLabel, isSongLanguage, type SongLanguage } from "@/components/inputs/song-language-select";
import { validatedHintClass } from "@/components/inputs/field-styles";
import type { SongCatalogItem } from "@/lib/platform/songs-service";

type CatalogSong = {
  id: string;
  title: string;
  artist: string;
  language: SongLanguage;
  lyricsUrl?: string;
  listenUrl?: string;
  canEdit: boolean;
};

type Tab = "catalog" | "register";
type CatalogGrouping = "artist" | "title";

type RegisterState = {
  title: string;
  artist: string;
  lyricsUrl: string;
  listenUrl: string;
  language: SongLanguage;
};

const emptyForm: RegisterState = {
  title: "",
  artist: "",
  lyricsUrl: "",
  listenUrl: "",
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
    canEdit: item.canEdit,
  };
}

type SongsPanelProps = {
  initialSongs: SongCatalogItem[];
  initialRepertoireLinks: Array<{ songId: string; repertoireEntryId: string }>;
};

export function SongsPanel({ initialSongs, initialRepertoireLinks }: SongsPanelProps) {
  const [tab, setTab] = useState<Tab>("catalog");
  const [songs, setSongs] = useState<CatalogSong[]>(() => initialSongs.map(toCatalogSong));
  const [selectedLetter, setSelectedLetter] = useState<string>("ALL");
  const [catalogGrouping, setCatalogGrouping] = useState<CatalogGrouping>("artist");
  const [form, setForm] = useState<RegisterState>(emptyForm);
  const [formError, setFormError] = useState<string>("");
  const [formSuccess, setFormSuccess] = useState<string>("");
  const [isSubmittingNewSong, setIsSubmittingNewSong] = useState(false);
  const [duplicateTitleMatches, setDuplicateTitleMatches] = useState<CatalogSong[] | null>(null);
  const [repertoireEntryBySongId, setRepertoireEntryBySongId] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialRepertoireLinks.map((l) => [l.songId, l.repertoireEntryId])),
  );

  const sortedSongs = useMemo(
    () =>
      [...songs].sort((a, b) => {
        if (catalogGrouping === "title") {
          const titleCmp = a.title.localeCompare(b.title);
          return titleCmp !== 0 ? titleCmp : a.artist.localeCompare(b.artist);
        }
        const artistCmp = a.artist.localeCompare(b.artist);
        return artistCmp !== 0 ? artistCmp : a.title.localeCompare(b.title);
      }),
    [songs, catalogGrouping],
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
      setFormError("Título e artista são obrigatórios.");
      return;
    }

    const lyricsUrl = sanitizeUrl(form.lyricsUrl);
    const listenUrl = sanitizeUrl(form.listenUrl);
    if (form.lyricsUrl.trim() && !lyricsUrl) {
      setFormError("A URL da letra deve começar com http:// ou https://");
      return;
    }
    if (form.listenUrl.trim() && !listenUrl) {
      setFormError("A URL para ouvir deve começar com http:// ou https://");
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
      setFormSuccess(`"${title}" de ${artist} adicionada ao catálogo.`);
      setTab("catalog");
      setSelectedLetter(
        songGroupingLetter({ id: "tmp", title, artist, language: form.language, canEdit: true }, catalogGrouping),
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
  }): Promise<string | null> {
    const updated = await updateSongAction({
      songId: input.songId,
      title: input.title,
      artist: input.artist,
      language: input.language,
      lyricsUrl: input.lyricsUrl,
      listenUrl: input.listenUrl,
    });
    if (updated.error) return updated.error;
      if (updated.pendingApproval) return "Solicitação de edição enviada ao autor para aprovação.";
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
      return { error: null, message: "Removida do repertório.", inRepertoire: false };
    }

    const added = await addToRepertoireAction({ songId, level: "LEARNING" });
    if (added.error) {
      return { error: added.error, message: added.error, inRepertoire: false };
    }
    const repertoireEntryId = added.repertoireEntryId;
    if (repertoireEntryId) {
      setRepertoireEntryBySongId((prev) => ({ ...prev, [songId]: repertoireEntryId }));
    }
    return { error: null, message: "Adicionada ao repertório.", inRepertoire: true };
  }

  return (
    <main id="app-main" className="mx-auto w-full max-w-5xl pb-8">
      <section className="rounded-2xl border border-[#2a3344] bg-[#171c26] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.22)] sm:p-5">
        <h2 className="m-0 text-xl font-semibold text-[#e8ecf4]">Catálogo de músicas</h2>
        <p className={`${validatedHintClass} mt-2`}>
          <strong>Catálogo</strong> agrupa músicas pela inicial do artista; <strong>Cadastrar</strong> adiciona uma
          nova música a esta visão.
        </p>

        <div className="mt-4 flex gap-2 border-b border-[#2a3344] pb-3" role="tablist" aria-label="Abas do catálogo">
          <PanelTabButton
            id="songs-tab-catalog"
            selected={tab === "catalog"}
            onClick={() => {
              setDuplicateTitleMatches(null);
              setTab("catalog");
            }}
            controlsId="songs-panel-catalog"
          >
            Catálogo
          </PanelTabButton>
          <PanelTabButton
            id="songs-tab-register"
            selected={tab === "register"}
            onClick={() => setTab("register")}
            controlsId="songs-panel-register"
          >
            Cadastrar
          </PanelTabButton>
        </div>

        <ShowWhen when={tab === "catalog"}>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#8b95a8]">Agrupar por inicial de</label>
            <select
              className="rounded-md border border-[#2a3344] bg-[#1e2533] px-2 py-1 text-xs font-semibold text-[#e8ecf4]"
              value={catalogGrouping}
              onChange={(e) => {
                const next = e.target.value === "title" ? "title" : "artist";
                setCatalogGrouping(next);
                setSelectedLetter("ALL");
              }}
            >
              <option value="artist">Artista</option>
              <option value="title">Título da música</option>
            </select>
            <span className="text-xs text-[#8b95a8]">
              Agrupado pela primeira letra de {catalogGrouping === "artist" ? "nome do artista" : "título da música"}.
            </span>
          </div>
          <SongCatalogTab
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
                isInRepertoire: !!repertoireEntryBySongId[song.id],
              })),
            ])}
            onSaveSong={submitSongEdit}
            onToggleSongInRepertoire={toggleSongInRepertoire}
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
                Outra entrada usa o mesmo título (ignorando maiúsculas/minúsculas). Você pode mudar o título ou
                adicionar esta música mesmo assim se for uma versão diferente.
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
                  Voltar
                </MintSlatePanelButton>
                <MintSlatePanelButton
                  type="button"
                  variant="mint"
                  className="min-w-32 flex-1"
                  disabled={isSubmittingNewSong}
                  onClick={() => void runRegisterCatalogSong(true)}
                >
                  {isSubmittingNewSong ? "Adicionando..." : "Adicionar mesmo assim"}
                </MintSlatePanelButton>
              </div>
            </div>
          ) : null}
          <SongRegisterTab
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
