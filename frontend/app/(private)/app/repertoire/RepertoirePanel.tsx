"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addToRepertoireAction,
  listSongKnowPlayersAction,
  removeFromRepertoireAction,
  updateRepertoireLevelAction,
} from "@/lib/actions/repertoire-actions";
import { setFollowStateAction } from "@/lib/actions/friends-actions";
import type { SongKnowPlayerItem } from "@/lib/platform/repertoire-service";
import { createSongAction, type CreateSongActionResult } from "@/lib/actions/songs-actions";
import { SongRegisterTab } from "@/app/(private)/app/songs/SongRegisterTab";
import { MintSlatePanelButton } from "@/components/buttons/MintSlatePanelButton";
import { ProfileAvatarBubble } from "@/components/avatar/ProfileAvatarBubble";
import { ShowWhen } from "@/components/conditional";
import { validatedHintClass, validatedInputClass } from "@/components/inputs/field-styles";
import { type SongLanguage } from "@/components/inputs/song-language-select";
import type { AppLocale } from "@/lib/i18n/locales";
import type { CatalogSongOption, RepertoireEntry } from "@/lib/platform/repertoire-service";
import { getAvatarInitials } from "@/lib/auth/user-display";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RepertoirePanelProps = {
  initialCatalog: CatalogSongOption[];
  initialEntries: RepertoireEntry[];
  locale: AppLocale;
  /** From `/app/repertoire?addSong=` (e.g. notification → add to repertoire). */
  highlightSongId?: string | null;
};

type RepertoireSortColumn = "title" | "level" | "artist" | "users";
type RepertoireSortDirection = "asc" | "desc";
type RegisterState = {
  title: string;
  artist: string;
  lyricsUrl: string;
  listenUrl: string;
  karaokeUrl: string;
  language: SongLanguage;
};

const emptyRegisterForm: RegisterState = {
  title: "",
  artist: "",
  lyricsUrl: "",
  listenUrl: "",
  karaokeUrl: "",
  language: "en",
};

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

function normalizeSongTitle(value: string): string {
  return value.trim().toLowerCase();
}

function repertoireLevelLabel(level: RepertoireEntry["level"], locale: AppLocale): string {
  if (locale === "en") return level === "ADVANCED" ? "Advanced" : "Learning";
  return level === "ADVANCED" ? "Avançado" : "Aprendendo";
}

export function RepertoirePanel({ initialCatalog, initialEntries, locale, highlightSongId = null }: RepertoirePanelProps) {
  const [catalog, setCatalog] = useState<CatalogSongOption[]>(initialCatalog);
  const [entries, setEntries] = useState<RepertoireEntry[]>(initialEntries);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [removingEntryId, setRemovingEntryId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<RepertoireSortColumn>("artist");
  const [sortDirection, setSortDirection] = useState<RepertoireSortDirection>("asc");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState<RegisterState>(emptyRegisterForm);
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");
  const [isSubmittingRegister, setIsSubmittingRegister] = useState(false);
  const [duplicateRegisterMatches, setDuplicateRegisterMatches] = useState<CatalogSongOption[] | null>(null);
  const [levelDialogEntry, setLevelDialogEntry] = useState<RepertoireEntry | null>(null);
  const [levelDraft, setLevelDraft] = useState<RepertoireEntry["level"]>("LEARNING");
  const [isUpdatingLevel, setIsUpdatingLevel] = useState(false);
  const [knowPlayersEntry, setKnowPlayersEntry] = useState<RepertoireEntry | null>(null);
  const [knowPlayers, setKnowPlayers] = useState<SongKnowPlayerItem[]>([]);
  const [loadingKnowPlayers, setLoadingKnowPlayers] = useState(false);
  const [knowPlayersError, setKnowPlayersError] = useState<string | null>(null);
  const [followBusyIds, setFollowBusyIds] = useState<Set<string>>(() => new Set());
  const [deepLinkNotice, setDeepLinkNotice] = useState<string | null>(null);

  const linkedSongIds = useMemo(() => new Set(entries.map((e) => e.songId)), [entries]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!highlightSongId || !UUID_RE.test(highlightSongId)) {
        setDeepLinkNotice(null);
        return;
      }
      const id = highlightSongId;
      if (!catalog.some((s) => s.id === id)) return;
      if (linkedSongIds.has(id)) {
        setDeepLinkNotice(locale === "pt" ? "Esta música já está no seu repertório." : "This song is already in your repertoire.");
        return;
      }
      setDeepLinkNotice(null);
      setPickerOpen(true);
      setSelectedSongIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      requestAnimationFrame(() => {
        document.getElementById(`repertoire-catalog-pick-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [highlightSongId, catalog, linkedSongIds, locale]);

  const availableSongs = useMemo(
    () =>
      catalog.filter((song) => {
        if (linkedSongIds.has(song.id)) return false;
        if (!query.trim()) return true;
        const t = query.trim().toLowerCase();
        return song.title.toLowerCase().includes(t) || song.artist.toLowerCase().includes(t);
      }),
    [catalog, linkedSongIds, query],
  );

  const selectedSongs = useMemo(
    () => catalog.filter((s) => selectedSongIds.includes(s.id)),
    [catalog, selectedSongIds],
  );
  const artistSuggestions = useMemo(
    () => [...new Set(catalog.map((song) => song.artist.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [catalog],
  );
  const sortedEntries = useMemo(() => {
    const sorted = [...entries].sort((a, b) => {
      if (sortColumn === "users") {
        return a.musiciansInRepertoire - b.musiciansInRepertoire;
      }
      if (sortColumn === "level") {
        return repertoireLevelLabel(a.level, locale).localeCompare(repertoireLevelLabel(b.level, locale));
      }
      return a[sortColumn].localeCompare(b[sortColumn]);
    });
    return sortDirection === "asc" ? sorted : sorted.reverse();
  }, [entries, sortColumn, sortDirection, locale]);

  async function addSelectedSong() {
    if (isAdding) return;
    setIsAdding(true);
    setError(null);
    try {
      if (selectedSongIds.length === 0) {
        setError(locale === "pt" ? "Escolha ao menos uma música do catálogo." : "Pick at least one song from catalog.");
        return;
      }

      const createdEntries: RepertoireEntry[] = [];
      const addedSongIds = new Set<string>();
      let firstError: string | null = null;

      for (const songId of selectedSongIds) {
        const result = await addToRepertoireAction({ songId, level: "ADVANCED" });
        if (result.error) {
          if (!firstError) firstError = result.error;
          continue;
        }
        const song = catalog.find((s) => s.id === songId);
        if (!song) continue;
        createdEntries.push({
          id: result.repertoireEntryId ?? `tmp-${Date.now()}-${songId}`,
          songId: song.id,
          title: song.title,
          artist: song.artist,
          language: song.language,
          level: "ADVANCED",
          musiciansInRepertoire: result.musiciansInRepertoire ?? 1,
        });
        addedSongIds.add(songId);
      }

      if (createdEntries.length > 0) {
        setEntries((prev) => [...createdEntries, ...prev]);
      }

      if (addedSongIds.size > 0) {
        setSelectedSongIds((prev) => prev.filter((id) => !addedSongIds.has(id)));
      }

      if (firstError) {
        setError(firstError);
      }
    } finally {
      setIsAdding(false);
    }
  }

  function catalogSongsWithSameTitle(title: string): CatalogSongOption[] {
    const key = normalizeSongTitle(title);
    if (!key) return [];
    return catalog.filter((s) => normalizeSongTitle(s.title) === key);
  }

  async function runRegisterSong(confirmSameTitle: boolean) {
    if (isSubmittingRegister) return;
    setRegisterError("");
    setRegisterSuccess("");

    const title = registerForm.title.trim();
    const artist = registerForm.artist.trim();
    if (!title || !artist) {
      setRegisterError(locale === "pt" ? "Título e artista são obrigatórios." : "Title and artist are required.");
      return;
    }

    const lyricsUrl = sanitizeUrl(registerForm.lyricsUrl);
    const listenUrl = sanitizeUrl(registerForm.listenUrl);
    const karaokeUrl = sanitizeUrl(registerForm.karaokeUrl);
    if (registerForm.lyricsUrl.trim() && !lyricsUrl) {
      setRegisterError(
        locale === "pt" ? "A URL da letra deve começar com http:// ou https://" : "Lyrics URL must start with http:// or https://",
      );
      return;
    }
    if (registerForm.listenUrl.trim() && !listenUrl) {
      setRegisterError(
        locale === "pt" ? "A URL para ouvir deve começar com http:// ou https://" : "Listen URL must start with http:// or https://",
      );
      return;
    }
    if (registerForm.karaokeUrl.trim() && !karaokeUrl) {
      setRegisterError(
        locale === "pt" ? "A URL de karaoke deve começar com http:// ou https://" : "Karaoke URL must start with http:// or https://",
      );
      return;
    }

    const dupes = catalogSongsWithSameTitle(title);
    if (dupes.length > 0 && !confirmSameTitle) {
      setDuplicateRegisterMatches(dupes);
      return;
    }
    setDuplicateRegisterMatches(null);

    setIsSubmittingRegister(true);
    try {
      const created: CreateSongActionResult = await createSongAction({
        title,
        artist,
        language: registerForm.language,
        lyricsUrl,
        listenUrl,
        karaokeUrl,
      });
      if (created.error || !created.song) {
        setRegisterError(created.error ?? (locale === "pt" ? "Não foi possível adicionar a música." : "Could not add the song."));
        return;
      }

      const newSong: CatalogSongOption = {
        id: created.song.id,
        title: created.song.title,
        artist: created.song.artist,
        language: created.song.language,
      };
      setCatalog((prev) => [newSong, ...prev]);
      setSelectedSongIds((prev) => (prev.includes(newSong.id) ? prev : [...prev, newSong.id]));
      setRegisterForm(emptyRegisterForm);
      setRegisterOpen(false);
      setRegisterSuccess(
        locale === "pt"
          ? `"${newSong.title}" pronta - clique em "Adicionar ao repertório".`
          : `"${newSong.title}" is ready - click "Add to repertoire".`,
      );
    } finally {
      setIsSubmittingRegister(false);
    }
  }

  async function submitRegisterSong(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await runRegisterSong(false);
  }

  function closeRegisterModal() {
    if (isSubmittingRegister) return;
    setRegisterOpen(false);
    setDuplicateRegisterMatches(null);
  }

  async function removeEntry(entryId: string) {
    if (removingEntryId) return;
    setRemovingEntryId(entryId);
    setError(null);
    try {
      const result = await removeFromRepertoireAction({ repertoireEntryId: entryId });
      if (result.error) {
        setError(result.error);
        return;
      }
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } finally {
      setRemovingEntryId(null);
    }
  }

  async function updateEntryLevel(level: RepertoireEntry["level"]) {
    const entry = levelDialogEntry;
    if (!entry || isUpdatingLevel) return;
    setIsUpdatingLevel(true);
    setError(null);
    try {
      const result = await updateRepertoireLevelAction({ repertoireEntryId: entry.id, level });
      if (result.error) {
        setError(result.error);
        return;
      }
      setEntries((prev) => prev.map((row) => (row.id === entry.id ? { ...row, level } : row)));
      setLevelDialogEntry(null);
    } finally {
      setIsUpdatingLevel(false);
    }
  }

  function openLevelDialog(entry: RepertoireEntry) {
    setLevelDialogEntry(entry);
    setLevelDraft(entry.level);
  }

  function toggleSort(column: RepertoireSortColumn) {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortColumn(column);
    setSortDirection("asc");
  }

  function sortIndicator(column: RepertoireSortColumn): string {
    if (sortColumn !== column) return "";
    return sortDirection === "asc" ? " ↑" : " ↓";
  }

  async function openKnowPlayersDialog(entry: RepertoireEntry) {
    setKnowPlayersEntry(entry);
    setKnowPlayers([]);
    setKnowPlayersError(null);
    setFollowBusyIds(new Set());
    setLoadingKnowPlayers(true);
    const res = await listSongKnowPlayersAction({ songId: entry.songId });
    if (res.error) {
      setKnowPlayersError(res.error);
      setLoadingKnowPlayers(false);
      return;
    }
    setKnowPlayers(res.players);
    setLoadingKnowPlayers(false);
  }

  async function followKnowPlayer(targetUserId: string) {
    if (followBusyIds.has(targetUserId)) return;
    setKnowPlayersError(null);
    setFollowBusyIds((prev) => new Set(prev).add(targetUserId));
    const res = await setFollowStateAction({ targetUserId, follow: true });
    setFollowBusyIds((prev) => {
      const next = new Set(prev);
      next.delete(targetUserId);
      return next;
    });
    if (res.error) {
      setKnowPlayersError(res.error);
      return;
    }
    setKnowPlayers((prev) =>
      prev.map((p) => (p.id === targetUserId ? { ...p, isFollowing: true } : p)),
    );
  }

  return (
    <main id="app-main" className="mx-auto w-full max-w-5xl pb-8">
      <section className="rounded-2xl border border-[#2a3344] bg-[#171c26] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.22)] sm:p-5">
        <h2 className="m-0 text-xl font-semibold text-[#e8ecf4]">{locale === "pt" ? "Seu repertório" : "Your repertoire"}</h2>
        <p className={`${validatedHintClass} mt-2`}>
          {locale === "pt" ? (
            <>
              Você edita apenas <strong>sua</strong> lista. <strong>Usuários</strong> é quantas pessoas têm esta música no
              repertório (app inteiro).
            </>
          ) : (
            <>
              You only edit <strong>your</strong> list. <strong>Users</strong> is how many people have this song in their
              repertoire (whole app).
            </>
          )}
        </p>

        <ShowWhen when={!!deepLinkNotice}>
          <p className="mt-4 rounded-lg border border-[#2a3344] bg-[#1a2230] px-3 py-2 text-xs text-[#c8cedd]">{deepLinkNotice}</p>
        </ShowWhen>

        <h3 className="mt-5 text-sm font-semibold tracking-wide text-[#8b95a8]">
          {locale === "pt" ? "Adicionar ao repertório" : "Add to repertoire"}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-[#2a3344] bg-[#1e2533] px-3 py-2 text-sm font-semibold text-[#e8ecf4]"
            onClick={() => setPickerOpen((v) => !v)}
          >
            {locale === "pt" ? "Buscar música no catálogo..." : "Search song in catalog..."}
          </button>
          <span className="text-sm text-[#8b95a8]">
            {selectedSongs.length > 0
              ? locale === "pt"
                ? `${selectedSongs.length} música(s) selecionada(s).`
                : `${selectedSongs.length} song(s) selected.`
              : locale === "pt"
                ? "Nenhuma música selecionada."
                : "No song selected."}
          </span>
        </div>

        <ShowWhen when={pickerOpen}>
          <div className="mt-3 rounded-xl border border-[#2a3344] bg-[#111722] p-3">
            <input
              className={validatedInputClass}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={locale === "pt" ? "Buscar músicas no catálogo..." : "Search songs in catalog..."}
            />
            <ul className="mt-3 max-h-64 space-y-2 overflow-auto">
              {availableSongs.map((song) => (
                <li
                  key={song.id}
                  id={`repertoire-catalog-pick-${song.id}`}
                  className="flex scroll-mt-20 items-center justify-between rounded-lg border border-[#2a3344] bg-[#1a2230] p-2"
                >
                  <span className="truncate text-sm text-[#e8ecf4]">
                    {song.title} - {song.artist}
                  </span>
                  <button
                    type="button"
                    className="rounded-md border border-[#2a3344] px-2 py-1 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
                    onClick={() => {
                      setSelectedSongIds((prev) =>
                        prev.includes(song.id) ? prev.filter((id) => id !== song.id) : [...prev, song.id],
                      );
                    }}
                  >
                    {selectedSongIds.includes(song.id)
                      ? locale === "pt"
                        ? "Selecionada"
                        : "Selected"
                      : locale === "pt"
                        ? "Selecionar"
                        : "Select"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </ShowWhen>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <MintSlatePanelButton variant="mint" className="w-auto px-4" onClick={addSelectedSong} disabled={isAdding}>
            {isAdding
              ? locale === "pt"
                ? "Adicionando..."
                : "Adding..."
              : locale === "pt"
                ? "Adicionar ao repertório"
                : "Add to repertoire"}
          </MintSlatePanelButton>
          <MintSlatePanelButton variant="slate" className="w-auto px-4" type="button" onClick={() => setRegisterOpen(true)}>
            {locale === "pt" ? "Cadastrar nova música" : "Register new song"}
          </MintSlatePanelButton>
        </div>

        <ShowWhen when={!!error}>
          <p className="mt-2 text-xs text-[#fca5a5]">{error}</p>
        </ShowWhen>
        <ShowWhen when={!!registerSuccess}>
          <p className="mt-2 text-xs text-[#86efac]">{registerSuccess}</p>
        </ShowWhen>

        <div className="mt-4 overflow-x-auto rounded-xl border border-[#2a3344]">
          <table className="min-w-full text-xs">
            <thead className="bg-[#111722] text-left text-[10px] tracking-wide text-[#8b95a8]">
              <tr>
                <th className="px-3 py-2">
                  <button type="button" className="hover:text-[#e8ecf4]" onClick={() => toggleSort("title")}>
                    {locale === "pt" ? "Música" : "Song"}
                    {sortIndicator("title")}
                  </button>
                </th>
                <th className="px-3 py-2">
                  <button type="button" className="hover:text-[#e8ecf4]" onClick={() => toggleSort("level")}>
                    {locale === "pt" ? "Nível" : "Level"}
                    {sortIndicator("level")}
                  </button>
                </th>
                <th className="px-3 py-2">
                  <button type="button" className="hover:text-[#e8ecf4]" onClick={() => toggleSort("artist")}>
                    {locale === "pt" ? "Artista" : "Artist"}
                    {sortIndicator("artist")}
                  </button>
                </th>
                <th className="px-3 py-2 text-right">
                  <button type="button" className="hover:text-[#e8ecf4]" onClick={() => toggleSort("users")}>
                    {locale === "pt" ? "Usuários" : "Users"}
                    {sortIndicator("users")}
                  </button>
                </th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry) => (
                <tr key={entry.id} className="border-t border-[#2a3344] text-[#e8ecf4] hover:bg-[#1a2230]">
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="cursor-pointer rounded-sm text-left text-[#e8ecf4] hover:text-[#6ee7b7]"
                      title={locale === "pt" ? "Clique para definir o nível desta música" : "Click to set this song level"}
                      onClick={() => openLevelDialog(entry)}
                    >
                      {entry.title}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-[#c8cedd]">{repertoireLevelLabel(entry.level, locale)}</td>
                  <td className="px-3 py-2">{entry.artist}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-[#c8cedd]">
                    <button
                      type="button"
                      className="rounded-sm px-1 text-right tabular-nums text-[#c8cedd] hover:text-[#6ee7b7]"
                      title={
                        locale === "pt"
                          ? "Abrir lista de quem sabe tocar esta música."
                          : "Open list of people who can play this song."
                      }
                      onClick={() => void openKnowPlayersDialog(entry)}
                    >
                      {entry.musiciansInRepertoire}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        disabled={removingEntryId === entry.id}
                        aria-label={
                          removingEntryId === entry.id
                            ? locale === "pt"
                              ? "Removendo música do repertório"
                              : "Removing song from repertoire"
                            : locale === "pt"
                              ? "Remover música do repertório"
                              : "Remove song from repertoire"
                        }
                        title={
                          removingEntryId === entry.id
                            ? locale === "pt"
                              ? "Removendo..."
                              : "Removing..."
                            : locale === "pt"
                              ? "Remover do repertório"
                              : "Remove from repertoire"
                        }
                        className="rounded-md border border-[#2a3344] px-2 py-1 text-xs font-semibold text-[#8b95a8] hover:text-[#fca5a5]"
                        onClick={(e) => {
                          e.stopPropagation();
                          void removeEntry(entry.id);
                        }}
                      >
                        {removingEntryId === entry.id ? (
                          "..."
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
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              <ShowWhen when={entries.length === 0}>
                <tr>
                  <td className="px-3 py-3 text-xs text-[#8b95a8]" colSpan={5}>
                    {locale === "pt" ? "Nenhuma música no seu repertório ainda." : "No songs in your repertoire yet."}
                  </td>
                </tr>
              </ShowWhen>
            </tbody>
          </table>
        </div>

        <ShowWhen when={registerOpen}>
          <div className="fixed inset-0 z-40 bg-black/55 p-4" onClick={closeRegisterModal}>
            <div
              className="mx-auto mt-12 max-h-[min(90dvh,calc(100vh-3rem))] w-full max-w-lg overflow-y-auto rounded-xl border border-[#2a3344] bg-[#171c26] shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="repertoire-register-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-1 flex items-start justify-between gap-2 border-b border-[#2a3344] bg-[#171c26] px-4 py-3">
                <h3 id="repertoire-register-title" className="m-0 pr-2 text-base font-semibold text-[#e8ecf4]">
                  {locale === "pt" ? "Cadastrar música no catálogo" : "Register song in catalog"}
                </h3>
                <button
                  type="button"
                  className="shrink-0 rounded-md border border-[#2a3344] px-2 py-1 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
                  disabled={isSubmittingRegister}
                  aria-label={locale === "pt" ? "Fechar cadastro" : "Close registration"}
                  onClick={closeRegisterModal}
                >
                  ×
                </button>
              </div>
              <div className="p-4">
                {duplicateRegisterMatches && duplicateRegisterMatches.length > 0 ? (
                  <div
                    className="mb-4 rounded-lg border border-[color-mix(in_srgb,#fbbf24_45%,#2a3344)] bg-[color-mix(in_srgb,#fbbf24_10%,#1e2533)] px-4 py-3 text-sm"
                    role="alert"
                  >
                    <p className="m-0 font-semibold text-[#fcd34d]">
                      {locale === "pt" ? "Este título já está no catálogo" : "This title is already in the catalog"}
                    </p>
                    <p className="mt-2 text-[#c8cedd]">
                      {locale === "pt"
                        ? "Outra entrada usa o mesmo título (ignorando maiúsculas/minúsculas). Altere o título ou adicione esta música mesmo assim se for uma versão diferente."
                        : "Another entry uses the same title (case-insensitive). Change the title or still add this song if it is a different version."}
                    </p>
                    <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-[#e8ecf4]">
                      {duplicateRegisterMatches.map((s) => (
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
                        onClick={() => setDuplicateRegisterMatches(null)}
                      >
                        {locale === "pt" ? "Voltar" : "Back"}
                      </MintSlatePanelButton>
                      <MintSlatePanelButton
                        type="button"
                        variant="mint"
                        className="min-w-32 flex-1"
                        disabled={isSubmittingRegister}
                        onClick={() => void runRegisterSong(true)}
                      >
                        {isSubmittingRegister ? (locale === "pt" ? "Adicionando..." : "Adding...") : locale === "pt" ? "Adicionar mesmo assim" : "Add anyway"}
                      </MintSlatePanelButton>
                    </div>
                  </div>
                ) : null}
                <SongRegisterTab
                  embedded
                  locale={locale}
                  artistSuggestions={artistSuggestions}
                  form={registerForm}
                  onChangeForm={(patch) => {
                    setDuplicateRegisterMatches(null);
                    setRegisterForm((prev) => ({
                      ...prev,
                      ...patch,
                      language: (patch.language ?? prev.language) as SongLanguage,
                    }));
                  }}
                  formError={registerError}
                  formSuccess=""
                  onSubmit={submitRegisterSong}
                  submitting={isSubmittingRegister}
                />
              </div>
              <div className="border-t border-[#2a3344] px-4 py-3">
                <button
                  type="button"
                  className="rounded-md border border-[#2a3344] px-3 py-1.5 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
                  disabled={isSubmittingRegister}
                  onClick={closeRegisterModal}
                >
                  {locale === "pt" ? "Fechar" : "Close"}
                </button>
              </div>
            </div>
          </div>
        </ShowWhen>

        <ShowWhen when={!!levelDialogEntry}>
          <div className="fixed inset-0 z-40 bg-black/55 p-4" onClick={() => (isUpdatingLevel ? null : setLevelDialogEntry(null))}>
            <div
              className="mx-auto mt-20 w-full max-w-md rounded-xl border border-[#2a3344] bg-[#171c26] p-4 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label={locale === "pt" ? "Definir nível da música no repertório" : "Set song level in repertoire"}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="m-0 text-base font-semibold text-[#e8ecf4]">{locale === "pt" ? "Definir nível" : "Set level"}</h3>
              <p className="mt-2 text-sm text-[#c8cedd]">
                {levelDialogEntry?.title} - {levelDialogEntry?.artist}
              </p>
              <p className="mt-1 text-xs text-[#8b95a8]">
                {locale === "pt" ? "Atual:" : "Current:"} {levelDialogEntry ? repertoireLevelLabel(levelDialogEntry.level, locale) : "-"}
              </p>
              <div className="mt-4">
                <label htmlFor="repertoire-level-select" className="mb-1 block text-xs text-[#8b95a8]">
                  {locale === "pt" ? "Novo nível" : "New level"}
                </label>
                <select
                  id="repertoire-level-select"
                  value={levelDraft}
                  disabled={isUpdatingLevel}
                  onChange={(e) => setLevelDraft(e.currentTarget.value as RepertoireEntry["level"])}
                  className="w-full rounded-lg border border-[#2a3344] bg-[#111722] px-3 py-2 text-sm text-[#e8ecf4]"
                >
                  <option value="LEARNING">{locale === "pt" ? "Aprendendo" : "Learning"}</option>
                  <option value="ADVANCED">{locale === "pt" ? "Avançado" : "Advanced"}</option>
                </select>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <MintSlatePanelButton
                  type="button"
                  variant="mint"
                  className="min-w-32 flex-1"
                  disabled={isUpdatingLevel}
                  onClick={() => void updateEntryLevel(levelDraft)}
                >
                  {isUpdatingLevel ? (locale === "pt" ? "Salvando..." : "Saving...") : locale === "pt" ? "Salvar nível" : "Save level"}
                </MintSlatePanelButton>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  className="rounded-md border border-[#2a3344] px-3 py-1.5 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
                  disabled={isUpdatingLevel}
                  onClick={() => setLevelDialogEntry(null)}
                >
                  {locale === "pt" ? "Fechar" : "Close"}
                </button>
              </div>
            </div>
          </div>
        </ShowWhen>

        <ShowWhen when={!!knowPlayersEntry}>
          <div className="fixed inset-0 z-40 bg-black/55 p-4" onClick={() => setKnowPlayersEntry(null)}>
            <div
              className="mx-auto mt-12 w-full max-w-xl rounded-xl border border-[#2a3344] bg-[#171c26] p-4 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label={locale === "pt" ? "Quem sabe tocar esta música" : "Who can play this song"}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="m-0 text-base font-semibold text-[#e8ecf4]">
                    {locale === "pt" ? "Quem sabe tocar" : "Who can play"}
                  </h3>
                  <p className="mt-1 text-xs text-[#8b95a8]">
                    {knowPlayersEntry?.title} - {knowPlayersEntry?.artist}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md border border-[#2a3344] px-2 py-1 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
                  onClick={() => setKnowPlayersEntry(null)}
                >
                  ×
                </button>
              </div>

              <ShowWhen when={loadingKnowPlayers}>
                <p className="mt-3 text-xs text-[#8b95a8]">{locale === "pt" ? "Carregando..." : "Loading..."}</p>
              </ShowWhen>
              <ShowWhen when={!!knowPlayersError}>
                <p className="mt-3 text-xs text-[#fca5a5]">{knowPlayersError}</p>
              </ShowWhen>
              <ShowWhen when={!loadingKnowPlayers && !knowPlayersError && knowPlayers.length === 0}>
                <p className="mt-3 text-xs text-[#8b95a8]">
                  {locale === "pt" ? "Nenhum usuário contabilizado para esta música." : "No users counted for this song."}
                </p>
              </ShowWhen>
              <ShowWhen when={!loadingKnowPlayers && !knowPlayersError && knowPlayers.length > 0}>
                <ul className="mt-3 max-h-80 list-none space-y-2 overflow-auto p-0">
                  {knowPlayers.map((player) => (
                    <li key={player.id} className="flex items-center justify-between rounded-lg border border-[#2a3344] bg-[#111722] px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <ProfileAvatarBubble
                          url={player.avatarUrl}
                          initials={getAvatarInitials(player.displayName ?? player.username ?? player.listName, undefined)}
                          size="sm"
                          decorative={false}
                        />
                        <div className="min-w-0">
                          <p className="m-0 truncate text-sm text-[#e8ecf4]">{player.listName}</p>
                          {player.username ? <p className="m-0 truncate text-[11px] text-[#8b95a8]">@{player.username}</p> : null}
                          {player.instruments.length > 0 ? (
                            <p className="m-0 truncate text-[10px] text-[#6b7588]">
                              {player.instruments.join(", ")}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!player.isSelf && !player.isFollowing ? (
                          <button
                            type="button"
                            onClick={() => void followKnowPlayer(player.id)}
                            disabled={followBusyIds.has(player.id)}
                            className="rounded border border-[#2a3344] px-2 py-1 text-[10px] font-semibold text-[#6ee7b7] hover:border-[#6ee7b7]/50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {followBusyIds.has(player.id) ? "..." : locale === "pt" ? "Seguir" : "Follow"}
                          </button>
                        ) : null}
                        <p className="m-0 text-[10px] text-[#8b95a8]">
                          {player.byRepertoire && player.byAnySongFlag
                            ? locale === "pt"
                              ? "Repertório + Any song"
                              : "Repertoire + Any song"
                            : player.byRepertoire
                              ? locale === "pt"
                                ? "Repertório"
                                : "Repertoire"
                              : "Any song"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </ShowWhen>
            </div>
          </div>
        </ShowWhen>
      </section>
    </main>
  );
}
