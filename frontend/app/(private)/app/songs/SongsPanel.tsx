"use client";

import { useMemo, useState } from "react";
import { PanelTabButton } from "@/components/buttons/PanelTabButton";
import { SongCatalogTab } from "@/app/(private)/app/songs/SongCatalogTab";
import { SongRegisterTab } from "@/app/(private)/app/songs/SongRegisterTab";
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
};

type Tab = "catalog" | "register";

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
  };
}

type SongsPanelProps = {
  initialSongs: SongCatalogItem[];
};

export function SongsPanel({ initialSongs }: SongsPanelProps) {
  const [tab, setTab] = useState<Tab>("catalog");
  const [songs, setSongs] = useState<CatalogSong[]>(() => initialSongs.map(toCatalogSong));
  const [selectedLetter, setSelectedLetter] = useState<string>("ALL");
  const [form, setForm] = useState<RegisterState>(emptyForm);
  const [formError, setFormError] = useState<string>("");
  const [formSuccess, setFormSuccess] = useState<string>("");

  const sortedSongs = useMemo(
    () =>
      [...songs].sort((a, b) => {
        const artistCmp = a.artist.localeCompare(b.artist);
        return artistCmp !== 0 ? artistCmp : a.title.localeCompare(b.title);
      }),
    [songs],
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, CatalogSong[]>();
    for (const song of sortedSongs) {
      const letter = artistLetter(song.artist);
      const existing = groups.get(letter);
      if (existing) existing.push(song);
      else groups.set(letter, [song]);
    }
    return groups;
  }, [sortedSongs]);

  const visibleLetters = useMemo(() => new Set(grouped.keys()), [grouped]);

  const visibleGroups = useMemo(() => {
    if (selectedLetter === "ALL") return [...grouped.entries()];
    const songsForLetter = grouped.get(selectedLetter);
    return songsForLetter ? [[selectedLetter, songsForLetter] as const] : [];
  }, [grouped, selectedLetter]);

  function submitNewSong(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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

    const newSong: CatalogSong = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      artist,
      language: form.language,
      lyricsUrl,
      listenUrl,
    };
    setSongs((prev) => [...prev, newSong]);
    setForm(emptyForm);
    setFormSuccess(`Added "${title}" by ${artist} to catalog.`);
    setTab("catalog");
    setSelectedLetter(artistLetter(artist));
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
              })),
            ])}
          />
        </ShowWhen>
        <ShowWhen when={tab === "register"}>
          <SongRegisterTab
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
          />
        </ShowWhen>
      </section>
    </main>
  );
}
