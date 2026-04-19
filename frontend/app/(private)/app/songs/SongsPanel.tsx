"use client";

import { useMemo, useState } from "react";
import { PanelTabButton } from "@/components/buttons/PanelTabButton";
import { SongCatalogTab } from "@/app/(private)/app/songs/SongCatalogTab";
import { SongRegisterTab } from "@/app/(private)/app/songs/SongRegisterTab";
import { addToRepertoireAction, removeFromRepertoireAction } from "@/app/(private)/app/repertoire/repertoire-actions";
import { createSongAction } from "@/app/(private)/app/songs/songs-actions";
import type { CreateSongActionResult } from "@/app/(private)/app/songs/songs-actions";
import { updateSongAction } from "@/app/(private)/app/songs/songs-actions";
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

  async function submitNewSong(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmittingNewSong) return;
    setIsSubmittingNewSong(true);
    try {
      setFormError("");
      setFormSuccess("");

      const title = form.title.trim();
      const artist = form.artist.trim();
      if (!title || !artist) {
        setFormError("Title and artist are required.");
        return;
      }

      const lyricsUrl = sanitizeUrl(form.lyricsUrl);
      const listenUrl = sanitizeUrl(form.listenUrl);
      if (form.lyricsUrl.trim() && !lyricsUrl) {
        setFormError("Lyrics URL must start with http:// or https://");
        return;
      }
      if (form.listenUrl.trim() && !listenUrl) {
        setFormError("Listen URL must start with http:// or https://");
        return;
      }

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
      setFormSuccess(`Added "${title}" by ${artist} to catalog.`);
      setTab("catalog");
      setSelectedLetter(songGroupingLetter({ id: "tmp", title, artist, language: form.language, canEdit: true }, catalogGrouping));
    } finally {
      setIsSubmittingNewSong(false);
    }
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
    if (updated.pendingApproval) return "Edit request sent to the author for approval.";
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
      return { error: null, message: "Removed from repertoire.", inRepertoire: false };
    }

    const added = await addToRepertoireAction({ songId, level: "LEARNING" });
    if (added.error) {
      return { error: added.error, message: added.error, inRepertoire: false };
    }
    const repertoireEntryId = added.repertoireEntryId;
    if (repertoireEntryId) {
      setRepertoireEntryBySongId((prev) => ({ ...prev, [songId]: repertoireEntryId }));
    }
    return { error: null, message: "Added to repertoire.", inRepertoire: true };
  }

  return (
    <main id="app-main" className="mx-auto w-full max-w-5xl pb-8">
      <section className="rounded-2xl border border-[#2a3344] bg-[#171c26] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.22)] sm:p-5">
        <h2 className="m-0 text-xl font-semibold text-[#e8ecf4]">Song catalog</h2>
        <p className={`${validatedHintClass} mt-2`}>
          <strong>Catalog</strong> groups songs by artist initial; <strong>Register</strong> adds a new song to this
          catalog view.
        </p>

        <div className="mt-4 flex gap-2 border-b border-[#2a3344] pb-3" role="tablist" aria-label="Catalog tabs">
          <PanelTabButton
            id="songs-tab-catalog"
            selected={tab === "catalog"}
            onClick={() => setTab("catalog")}
            controlsId="songs-panel-catalog"
          >
            Catalog
          </PanelTabButton>
          <PanelTabButton
            id="songs-tab-register"
            selected={tab === "register"}
            onClick={() => setTab("register")}
            controlsId="songs-panel-register"
          >
            Register
          </PanelTabButton>
        </div>

        <ShowWhen when={tab === "catalog"}>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#8b95a8]">Group by letter of</label>
            <select
              className="rounded-md border border-[#2a3344] bg-[#1e2533] px-2 py-1 text-xs font-semibold text-[#e8ecf4]"
              value={catalogGrouping}
              onChange={(e) => {
                const next = e.target.value === "title" ? "title" : "artist";
                setCatalogGrouping(next);
                setSelectedLetter("ALL");
              }}
            >
              <option value="artist">Artist</option>
              <option value="title">Song title</option>
            </select>
            <span className="text-xs text-[#8b95a8]">
              Grouped by first letter of {catalogGrouping === "artist" ? "artist name" : "song title"}.
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
          <SongRegisterTab
            artistSuggestions={artistSuggestions}
            form={form}
            onChangeForm={(patch) =>
              setForm((prev) => ({
                ...prev,
                ...patch,
                language: (patch.language ?? prev.language) as SongLanguage,
              }))
            }
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
