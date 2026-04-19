import { MintSlatePanelButton } from "@/components/buttons/MintSlatePanelButton";
import { ShowWhen } from "@/components/conditional";

type SongCatalogCardProps = {
  title: string;
  artist: string;
  languageLabel: string;
  lyricsUrl?: string;
  listenUrl?: string;
};

/** Row card for each song in the catalog list. */
export function SongCatalogCard({ title, artist, languageLabel, lyricsUrl, listenUrl }: SongCatalogCardProps) {
  return (
    <li className="rounded-lg border border-[#2a3344] bg-[#1a2230] p-3 sm:flex sm:items-center sm:justify-between sm:gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[#e8ecf4]">{title}</p>
        <p className="truncate text-xs text-[#8b95a8]">
          {artist} · {languageLabel}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 sm:mt-0">
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
    </li>
  );
}
