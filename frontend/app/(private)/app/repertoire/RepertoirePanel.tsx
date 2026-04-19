"use client";

import { useMemo, useState } from "react";
import { addToRepertoireAction, removeFromRepertoireAction } from "@/app/(private)/app/repertoire/repertoire-actions";
import { MintSlatePanelButton } from "@/components/buttons/MintSlatePanelButton";
import { ShowWhen } from "@/components/conditional";
import { validatedHintClass, validatedInputClass } from "@/components/inputs/field-styles";
import type { CatalogSongOption, RepertoireEntry, RepertoireLevel } from "@/lib/platform/repertoire-service";

type RepertoirePanelProps = {
  initialCatalog: CatalogSongOption[];
  initialEntries: RepertoireEntry[];
};

function languageLabel(language: string): string {
  const normalized = language.trim().toLowerCase();
  const map: Record<string, string> = {
    en: "English",
    es: "Spanish",
    pt: "Portuguese",
    fr: "French",
    it: "Italian",
    ja: "Japanese",
    de: "German",
    ko: "Korean",
    zh: "Mandarin Chinese",
    hi: "Hindi",
  };
  return map[normalized] ?? language.toUpperCase();
}

export function RepertoirePanel({ initialCatalog, initialEntries }: RepertoirePanelProps) {
  const [catalog] = useState<CatalogSongOption[]>(initialCatalog);
  const [entries, setEntries] = useState<RepertoireEntry[]>(initialEntries);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedSongId, setSelectedSongId] = useState<string>("");
  const [level, setLevel] = useState<RepertoireLevel>("ADVANCED");
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [removingEntryId, setRemovingEntryId] = useState<string | null>(null);

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
        },
        ...prev,
      ]);
      setSelectedSongId("");
    } finally {
      setIsAdding(false);
    }
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

  return (
    <main id="app-main" className="mx-auto w-full max-w-5xl pb-8">
      <section className="rounded-2xl border border-[#2a3344] bg-[#171c26] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.22)] sm:p-5">
        <h2 className="m-0 text-xl font-semibold text-[#e8ecf4]">Your repertoire</h2>
        <p className={`${validatedHintClass} mt-2`}>
          You can only manage <strong>your own</strong> repertoire. Pick songs from catalog and set your level.
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
        </div>

        <ShowWhen when={!!error}>
          <p className="mt-2 text-xs text-[#fca5a5]">{error}</p>
        </ShowWhen>

        <div className="mt-4 overflow-x-auto rounded-xl border border-[#2a3344]">
          <table className="min-w-full text-sm">
            <thead className="bg-[#111722] text-left text-xs uppercase tracking-wide text-[#8b95a8]">
              <tr>
                <th className="px-3 py-2">Song</th>
                <th className="px-3 py-2">Artist</th>
                <th className="px-3 py-2">Language</th>
                <th className="px-3 py-2">Level</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-t border-[#2a3344] text-[#e8ecf4]">
                  <td className="px-3 py-2">{entry.title}</td>
                  <td className="px-3 py-2">{entry.artist}</td>
                  <td className="px-3 py-2">{languageLabel(entry.language)}</td>
                  <td className="px-3 py-2">{entry.level}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={removingEntryId === entry.id}
                      className="rounded-md border border-[#2a3344] px-2 py-1 text-xs font-semibold text-[#8b95a8] hover:text-[#fca5a5]"
                      onClick={() => removeEntry(entry.id)}
                    >
                      {removingEntryId === entry.id ? "Removing..." : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
              <ShowWhen when={entries.length === 0}>
                <tr>
                  <td className="px-3 py-3 text-sm text-[#8b95a8]" colSpan={5}>
                    No songs in your repertoire yet.
                  </td>
                </tr>
              </ShowWhen>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
