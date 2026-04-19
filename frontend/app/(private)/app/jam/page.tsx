import { getJamSongSuggestions } from "@/lib/platform/jam-service";

export const metadata = {
  title: "Jam — Jam Session Assistant",
};

function formatLastPlayed(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString();
}

export default async function JamPage() {
  const suggestions = await getJamSongSuggestions(30);

  return (
    <main id="app-main" className="mx-auto w-full max-w-5xl pb-8">
      <section className="rounded-2xl border border-[#2a3344] bg-[#171c26] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.22)] sm:p-5">
        <h2 className="m-0 text-xl font-semibold text-[#e8ecf4]">Jam suggestions</h2>
        <p className="mt-2 text-xs text-[#8b95a8]">
          Ordered by lower play count first. Tie-breaker: songs never played or least recently played.
        </p>

        <div className="mt-4 overflow-x-auto rounded-xl border border-[#2a3344]">
          <table className="min-w-full text-xs">
            <thead className="bg-[#111722] text-left text-[10px] uppercase tracking-wide text-[#8b95a8]">
              <tr>
                <th className="px-3 py-2">Song</th>
                <th className="px-3 py-2">Artist</th>
                <th className="px-3 py-2">Played</th>
                <th className="px-3 py-2">Last played</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((song) => (
                <tr key={song.songId} className="border-t border-[#2a3344] text-[#e8ecf4]">
                  <td className="px-3 py-2">{song.title}</td>
                  <td className="px-3 py-2">{song.artist}</td>
                  <td className="px-3 py-2">{song.playCount}</td>
                  <td className="px-3 py-2">{formatLastPlayed(song.lastPlayedAt)}</td>
                </tr>
              ))}
              {suggestions.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-xs text-[#8b95a8]" colSpan={4}>
                    No catalog songs available yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
