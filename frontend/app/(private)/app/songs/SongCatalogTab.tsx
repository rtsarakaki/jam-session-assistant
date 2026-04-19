import { SongCatalogCard } from "@/app/(private)/app/songs/SongCatalogCard";
import { ShowWhen } from "@/components/conditional";
import type { SongLanguage } from "@/components/inputs/song-language-select";
import { AlphabetFilter } from "@/components/inputs/AlphabetFilter";
import { validatedHintClass } from "@/components/inputs/field-styles";

type CatalogGroupSong = {
  id: string;
  title: string;
  artist: string;
  language: SongLanguage;
  languageLabel: string;
  lyricsUrl?: string;
  listenUrl?: string;
  canEdit: boolean;
  isInRepertoire: boolean;
};

type SongCatalogTabProps = {
  letters: string[];
  selectedLetter: string;
  enabledLetters: ReadonlySet<string>;
  onSelectLetter: (letter: string) => void;
  visibleGroups: ReadonlyArray<readonly [string, CatalogGroupSong[]]>;
  onSaveSong: (input: {
    songId: string;
    title: string;
    artist: string;
    language: SongLanguage;
    lyricsUrl?: string;
    listenUrl?: string;
  }) => Promise<string | null>;
  onToggleSongInRepertoire: (songId: string) => Promise<{ error: string | null; message: string; inRepertoire: boolean }>;
};

/** Songs catalog view with A-Z filter and grouped cards. */
export function SongCatalogTab({
  letters,
  selectedLetter,
  enabledLetters,
  onSelectLetter,
  visibleGroups,
  onSaveSong,
  onToggleSongInRepertoire,
}: SongCatalogTabProps) {
  return (
    <div id="songs-panel-catalog" role="tabpanel" aria-labelledby="songs-tab-catalog" className="mt-4">
      <AlphabetFilter letters={letters} selected={selectedLetter} enabledLetters={enabledLetters} onSelect={onSelectLetter} />

      <ShowWhen when={visibleGroups.length === 0}>
        <p className={validatedHintClass}>No songs for this letter yet.</p>
      </ShowWhen>
      <ShowWhen when={visibleGroups.length > 0}>
        <div className="space-y-4">
          {visibleGroups.map(([letter, letterSongs]) => (
            <section key={letter} className="rounded-xl border border-[#2a3344] bg-[#111722] p-3">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#6ee7b7]">{letter}</h3>
              <ul className="space-y-2">
                {letterSongs.map((song) => (
                  <SongCatalogCard
                    key={song.id}
                    id={song.id}
                    title={song.title}
                    artist={song.artist}
                    language={song.language}
                    languageLabel={song.languageLabel}
                    lyricsUrl={song.lyricsUrl}
                    listenUrl={song.listenUrl}
                    canEdit={song.canEdit}
                    isInRepertoire={song.isInRepertoire}
                    onSaveSong={onSaveSong}
                    onToggleRepertoire={onToggleSongInRepertoire}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </ShowWhen>
    </div>
  );
}
