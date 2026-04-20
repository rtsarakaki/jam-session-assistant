import { HighlightButton } from "@/components/buttons/HighlightButton";
import { RegularButton } from "@/components/buttons/RegularButton";

export default function Home() {
  return (
    <div className="min-h-dvh bg-[#0f1218] bg-[radial-gradient(1200px_600px_at_10%_-10%,#1a2435_0%,#0f1218_55%)] px-4 py-10 text-[#e8ecf4]">
      <article className="mx-auto w-full max-w-5xl rounded-xl border border-[#2a3344] bg-[#171c26] p-7 shadow-xl sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <section>
            <h1 className="text-[1.45rem] font-bold tracking-tight text-[#e8ecf4] sm:text-3xl">
              Jam Session
            </h1>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-[#e8ecf4] sm:text-[1rem]">
              Plan <strong className="font-semibold text-[#6ee7b7]">in-person jam sessions</strong> with less
              friction: see who is in the room, align on a shared song catalog, and get a{" "}
              <strong className="font-semibold text-[#6ee7b7]">suggested setlist</strong> that everyone can
              play.
            </p>
            <p className="mt-2 text-[0.85rem] leading-relaxed text-[#aeb8cb] sm:text-[0.92rem]">
              Designed for musicians, bands, and communities that want to spend less time negotiating and
              more time actually playing.
            </p>
            <ul className="mt-4 list-disc space-y-1.5 pl-5 text-[0.875rem] leading-relaxed text-[#8b95a8]">
              <li>
                <strong className="font-semibold text-[#e8ecf4]">Repertoire</strong> - each musician tracks
                what they can perform now.
              </li>
              <li>
                <strong className="font-semibold text-[#e8ecf4]">Jam session</strong> - pick participants and
                get overlap-based suggestions for the group.
              </li>
              <li>
                <strong className="font-semibold text-[#e8ecf4]">Audience participation</strong> - people in
                the room can request songs in real time.
              </li>
              <li>
                <strong className="font-semibold text-[#e8ecf4]">Feed</strong> - share performances and songs
                you like with friends.
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <HighlightButton>Sign up</HighlightButton>
              <RegularButton>Log in</RegularButton>
            </div>
          </section>

          <section className="space-y-3 rounded-lg border border-[#2a3344] bg-[#111722] p-3">
            <h2 className="text-sm font-semibold text-[#dbe4f6]">Watch the product tour</h2>
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-[0.74rem] font-semibold text-[#aeb8cb]">English</p>
                <div className="relative overflow-hidden rounded-md border border-[#2a3344] pb-[56.25%]">
                  <iframe
                    src="https://www.youtube.com/embed/T55kLFCeSkg"
                    title="Jam Session product tour in English"
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              </div>
              <div>
                <p className="mb-1 text-[0.74rem] font-semibold text-[#aeb8cb]">Portuguese</p>
                <div className="relative overflow-hidden rounded-md border border-[#2a3344] pb-[56.25%]">
                  <iframe
                    src="https://www.youtube.com/embed/KtWcGcpNkVg"
                    title="Jam Session product tour in Portuguese"
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        <p className="mt-6 border-t border-[#2a3344] pt-4 text-[0.78rem] leading-relaxed text-[#8b95a8]">
          After sign-in (once built), you&apos;ll use in-app navigation — Jam, Songs, repertoire, Friends,
          Profile. Use <strong className="text-[#e8ecf4]">Log in</strong> when you already have an account.
        </p>
      </article>
    </div>
  );
}
