"use client";

import { useEffect, useMemo, useState } from "react";
import { addToRepertoireAction, removeFromRepertoireAction, updateRepertoireLevelAction } from "@/lib/actions/repertoire-actions";
import { createSongAction, type CreateSongActionResult } from "@/lib/actions/songs-actions";
import { SongRegisterTab } from "@/app/(private)/app/songs/SongRegisterTab";
import { MintSlatePanelButton } from "@/components/buttons/MintSlatePanelButton";
import { ShowWhen } from "@/components/conditional";
import { validatedHintClass, validatedInputClass } from "@/components/inputs/field-styles";
import { type SongLanguage } from "@/components/inputs/song-language-select";
import type { CatalogSongOption, RepertoireEntry, RepertoireLevel } from "@/lib/platform/repertoire-service";

type RepertoirePanelProps = {
  initialCatalog: CatalogSongOption[];
  initialEntries: RepertoireEntry[];
};

type RepertoireSortColumn = "title" | "artist" | "level" | "musicians";
type RepertoireSortDirection = "asc" | "desc";
type RegisterState = {
  title: string;
  artist: string;
  lyricsUrl: string;
  listenUrl: string;
  language: SongLanguage;
};

const emptyRegisterForm: RegisterState = {
  title: "",
  artist: "",
  lyricsUrl: "",
  listenUrl: "",
  language: "en",
};

function levelShortLabel(level: RepertoireLevel): string {
  return level === "ADVANCED" ? "ADV" : "LRN";
}

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

export function RepertoirePanel({ initialCatalog, initialEntries }: RepertoirePanelProps) {
  const [catalog, setCatalog] = useState<CatalogSongOption[]>(initialCatalog);
  const [entries, setEntries] = useState<RepertoireEntry[]>(initialEntries);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedSongId, setSelectedSongId] = useState<string>("");
  const [level, setLevel] = useState<RepertoireLevel>("ADVANCED");
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [removingEntryId, setRemovingEntryId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingLevel, setEditingLevel] = useState<RepertoireLevel>("ADVANCED");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [sortColumn, setSortColumn] = useState<RepertoireSortColumn>("artist");
  const [sortDirection, setSortDirection] = useState<RepertoireSortDirection>("asc");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState<RegisterState>(emptyRegisterForm);
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");
  const [isSubmittingRegister, setIsSubmittingRegister] = useState(false);
  const [duplicateRegisterMatches, setDuplicateRegisterMatches] = useState<CatalogSongOption[] | null>(null);

  const linkedSongIds = useMemo(() => new Set(entries.map((e) => e.songId)), [entries]);

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

  const selectedSong = useMemo(() => catalog.find((s) => s.id === selectedSongId) ?? null, [catalog, selectedSongId]);
  const editingEntry = useMemo(() => entries.find((entry) => entry.id === editingEntryId) ?? null, [entries, editingEntryId]);
  const artistSuggestions = useMemo(
    () => [...new Set(catalog.map((song) => song.artist.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [catalog],
  );
  useEffect(() => {
    if (!registerOpen) setDuplicateRegisterMatches(null);
  }, [registerOpen]);

  const sortedEntries = useMemo(() => {
    const sorted = [...entries].sort((a, b) => {
      if (sortColumn === "level") {
        const aLabel = levelShortLabel(a.level);
        const bLabel = levelShortLabel(b.level);
        return aLabel.localeCompare(bLabel);
      }
      if (sortColumn === "musicians") {
        return a.musiciansInRepertoire - b.musiciansInRepertoire;
      }
      return a[sortColumn].localeCompare(b[sortColumn]);
    });
    return sortDirection === "asc" ? sorted : sorted.reverse();
  }, [entries, sortColumn, sortDirection]);

  async function addSelectedSong() {
    if (isAdding) return;
    setIsAdding(true);
    setError(null);
    try {
      if (!selectedSongId) {
        setError("Pick a song from catalog.");
        return;
      }
      const result = await addToRepertoireAction({ songId: selectedSongId, level });
      if (result.error) {
        setError(result.error);
        return;
      }
      const song = catalog.find((s) => s.id === selectedSongId);
      if (!song) return;
      setEntries((prev) => [
        {
          id: result.repertoireEntryId ?? `tmp-${Date.now()}`,
          songId: song.id,
          title: song.title,
          artist: song.artist,
          language: song.language,
          level,
          musiciansInRepertoire: result.musiciansInRepertoire ?? 1,
        },
        ...prev,
      ]);
      setSelectedSongId("");
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
      setRegisterError("Title and artist are required.");
      return;
    }

    const lyricsUrl = sanitizeUrl(registerForm.lyricsUrl);
    const listenUrl = sanitizeUrl(registerForm.listenUrl);
    if (registerForm.lyricsUrl.trim() && !lyricsUrl) {
      setRegisterError("Lyrics URL must start with http:// or https://");
      return;
    }
    if (registerForm.listenUrl.trim() && !listenUrl) {
      setRegisterError("Listen URL must start with http:// or https://");
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
      });
      if (created.error || !created.song) {
        setRegisterError(created.error ?? "Could not add song.");
        return;
      }

      const newSong: CatalogSongOption = {
        id: created.song.id,
        title: created.song.title,
        artist: created.song.artist,
        language: created.song.language,
      };
      setCatalog((prev) => [newSong, ...prev]);
      setSelectedSongId(newSong.id);
      setRegisterForm(emptyRegisterForm);
      setRegisterOpen(false);
      setRegisterSuccess(`"${newSong.title}" is ready to add. Choose the level and click "Add to repertoire".`);
    } finally {
      setIsSubmittingRegister(false);
    }
  }

  async function submitRegisterSong(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await runRegisterSong(false);
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

  function startEditEntry(entry: RepertoireEntry) {
    if (isSavingEdit) return;
    setEditingEntryId(entry.id);
    setEditingLevel(entry.level);
    setError(null);
  }

  async function saveEditedEntry() {
    if (!editingEntryId || isSavingEdit) return;
    setIsSavingEdit(true);
    setError(null);
    try {
      const result = await updateRepertoireLevelAction({ repertoireEntryId: editingEntryId, level: editingLevel });
      if (result.error) {
        setError(result.error);
        return;
      }
      setEntries((prev) => prev.map((entry) => (entry.id === editingEntryId ? { ...entry, level: editingLevel } : entry)));
      setEditingEntryId(null);
    } finally {
      setIsSavingEdit(false);
    }
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

  return (
    <main id="app-main" className="mx-auto w-full max-w-5xl pb-8">
      <section className="rounded-2xl border border-[#2a3344] bg-[#171c26] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.22)] sm:p-5">
        <h2 className="m-0 text-xl font-semibold text-[#e8ecf4]">Your repertoire</h2>
        <p className={`${validatedHintClass} mt-2`}>
          You can only manage <strong>your own</strong> repertoire. Pick songs from catalog and set your level.{" "}
          <strong>Musicians</strong> is how many profiles (any user) have that song in their repertoire.
        </p>

        <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-[#8b95a8]">Add to repertoire</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-[#2a3344] bg-[#1e2533] px-3 py-2 text-sm font-semibold text-[#e8ecf4]"
            onClick={() => setPickerOpen((v) => !v)}
          >
            Find song in catalog...
          </button>
          <span className="text-sm text-[#8b95a8]">
            {selectedSong ? `${selectedSong.title} — ${selectedSong.artist}` : "No song selected."}
          </span>
        </div>

        <ShowWhen when={pickerOpen}>
          <div className="mt-3 rounded-xl border border-[#2a3344] bg-[#111722] p-3">
            <input
              className={validatedInputClass}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search songs in catalog..."
            />
            <ul className="mt-3 max-h-64 space-y-2 overflow-auto">
              {availableSongs.map((song) => (
                <li key={song.id} className="flex items-center justify-between rounded-lg border border-[#2a3344] bg-[#1a2230] p-2">
                  <span className="truncate text-sm text-[#e8ecf4]">
                    {song.title} — {song.artist}
                  </span>
                  <button
                    type="button"
                    className="rounded-md border border-[#2a3344] px-2 py-1 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
                    onClick={() => {
                      setSelectedSongId(song.id);
                      setPickerOpen(false);
                    }}
                  >
                    Select
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </ShowWhen>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select className={validatedInputClass} value={level} onChange={(e) => setLevel(e.target.value as RepertoireLevel)}>
            <option value="ADVANCED">ADVANCED — strong</option>
            <option value="LEARNING">LEARNING — learning</option>
          </select>
          <MintSlatePanelButton variant="mint" className="w-auto px-4" onClick={addSelectedSong} disabled={isAdding}>
            {isAdding ? "Adding..." : "Add to repertoire"}
          </MintSlatePanelButton>
          <MintSlatePanelButton
            variant="slate"
            className="w-auto px-4"
            type="button"
            onClick={() => setRegisterOpen((prev) => !prev)}
          >
            {registerOpen ? "Close register" : "Register new song"}
          </MintSlatePanelButton>
        </div>

        <ShowWhen when={!!error}>
          <p className="mt-2 text-xs text-[#fca5a5]">{error}</p>
        </ShowWhen>
        <ShowWhen when={!!registerSuccess}>
          <p className="mt-2 text-xs text-[#86efac]">{registerSuccess}</p>
        </ShowWhen>
        <ShowWhen when={registerOpen}>
          <div className="mt-3 rounded-xl border border-[#2a3344] bg-[#111722] p-3">
            {duplicateRegisterMatches && duplicateRegisterMatches.length > 0 ? (
              <div
                className="mb-4 rounded-lg border border-[color-mix(in_srgb,#fbbf24_45%,#2a3344)] bg-[color-mix(in_srgb,#fbbf24_10%,#1e2533)] px-4 py-3 text-sm"
                role="alert"
              >
                <p className="m-0 font-semibold text-[#fcd34d]">This title is already in the catalog</p>
                <p className="mt-2 text-[#c8cedd]">
                  Another entry uses the same title (ignoring capitalization). Change the title or add this song anyway
                  if it is a different piece or version.
                </p>
                <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-[#e8ecf4]">
                  {duplicateRegisterMatches.map((s) => (
                    <li key={s.id}>
                      <span className="font-medium">{s.title}</span>
                      <span className="text-[#8b95a8]"> — {s.artist}</span>
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
                    Go back
                  </MintSlatePanelButton>
                  <MintSlatePanelButton
                    type="button"
                    variant="mint"
                    className="min-w-32 flex-1"
                    disabled={isSubmittingRegister}
                    onClick={() => void runRegisterSong(true)}
                  >
                    {isSubmittingRegister ? "Adding…" : "Add anyway"}
                  </MintSlatePanelButton>
                </div>
              </div>
            ) : null}
            <SongRegisterTab
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
        </ShowWhen>

        <div className="mt-4 overflow-x-auto rounded-xl border border-[#2a3344]">
          <table className="min-w-full text-xs">
            <thead className="bg-[#111722] text-left text-[10px] uppercase tracking-wide text-[#8b95a8]">
              <tr>
                <th className="px-3 py-2">
                  <button type="button" className="hover:text-[#e8ecf4]" onClick={() => toggleSort("title")}>
                    Song{sortIndicator("title")}
                  </button>
                </th>
                <th className="px-3 py-2">
                  <button type="button" className="hover:text-[#e8ecf4]" onClick={() => toggleSort("artist")}>
                    Artist{sortIndicator("artist")}
                  </button>
                </th>
                <th className="px-3 py-2">
                  <button type="button" className="hover:text-[#e8ecf4]" onClick={() => toggleSort("level")}>
                    Level{sortIndicator("level")}
                  </button>
                </th>
                <th className="px-3 py-2 text-right">
                  <button type="button" className="hover:text-[#e8ecf4]" onClick={() => toggleSort("musicians")}>
                    Musicians{sortIndicator("musicians")}
                  </button>
                </th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry) => (
                <tr
                  key={entry.id}
                  className="cursor-pointer border-t border-[#2a3344] text-[#e8ecf4] hover:bg-[#1a2230]"
                  onClick={() => startEditEntry(entry)}
                >
                  <td className="px-3 py-2">{entry.title}</td>
                  <td className="px-3 py-2">{entry.artist}</td>
                  <td className="px-3 py-2">{levelShortLabel(entry.level)}</td>
                  <td
                    className="px-3 py-2 text-right tabular-nums text-[#c8cedd]"
                    title="Distinct profiles with this song in their repertoire (app-wide)."
                  >
                    {entry.musiciansInRepertoire}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        disabled={removingEntryId === entry.id}
                        aria-label={removingEntryId === entry.id ? "Removing song from repertoire" : "Remove song from repertoire"}
                        title={removingEntryId === entry.id ? "Removing..." : "Remove from repertoire"}
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
                    No songs in your repertoire yet.
                  </td>
                </tr>
              </ShowWhen>
            </tbody>
          </table>
        </div>
        <ShowWhen when={editingEntry !== null}>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-xl border border-[#2a3344] bg-[#171c26] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.4)]">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#8b95a8]">Edit repertoire level</h3>
              <p className="mt-2 text-sm text-[#e8ecf4]">
                {editingEntry?.title} - {editingEntry?.artist}
              </p>
              <div className="mt-3">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#8b95a8]">Level</label>
                <select
                  className={validatedInputClass}
                  value={editingLevel}
                  onChange={(e) => setEditingLevel(e.target.value as RepertoireLevel)}
                  disabled={isSavingEdit}
                >
                  <option value="ADVANCED">ADVANCED</option>
                  <option value="LEARNING">LEARNING</option>
                </select>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md border border-[#2a3344] px-3 py-1.5 text-xs font-semibold text-[#8b95a8] hover:text-[#e8ecf4]"
                  onClick={() => setEditingEntryId(null)}
                  disabled={isSavingEdit}
                >
                  Cancel
                </button>
                <MintSlatePanelButton variant="mint" className="w-auto px-3 py-1.5 text-xs" onClick={saveEditedEntry} disabled={isSavingEdit}>
                  {isSavingEdit ? "Saving..." : "Save"}
                </MintSlatePanelButton>
              </div>
            </div>
          </div>
        </ShowWhen>
      </section>
    </main>
  );
}
