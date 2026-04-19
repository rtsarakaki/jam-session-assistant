import { HighlightButton } from "@/components/buttons/HighlightButton";
import { RegularButton } from "@/components/buttons/RegularButton";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0f1218] bg-[radial-gradient(1200px_600px_at_10%_-10%,#1a2435_0%,#0f1218_55%)] px-4 py-10 text-[#e8ecf4]">
      <article className="w-full max-w-136 rounded-xl border border-[#2a3344] bg-[#171c26] p-7 shadow-xl sm:p-8">
        <h1 className="text-[1.35rem] font-bold tracking-tight text-[#e8ecf4] sm:text-2xl">
          Jam Session
        </h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-[#e8ecf4]">
          Plan <strong className="font-semibold text-[#6ee7b7]">in-person jam sessions</strong> with less
          friction: see who is in the room, align on a shared song catalog, and get a{" "}
          <strong className="font-semibold text-[#6ee7b7]">suggested setlist</strong> that everyone can play —
          so you spend less time arguing about the next tune and more time playing.
        </p>
        <ul className="mt-4 list-disc space-y-1.5 pl-5 text-[0.875rem] leading-relaxed text-[#8b95a8]">
          <li>
            <strong className="font-semibold text-[#e8ecf4]">Repertoire</strong> — each musician tracks what
            they know and how well they know it.
          </li>
          <li>
            <strong className="font-semibold text-[#e8ecf4]">Jam session</strong> — pick participants, then
            generate overlap-friendly suggestions for the group.
          </li>
          <li>
            <strong className="font-semibold text-[#e8ecf4]">Audience link</strong> — share a simple page so
            people in the room can request songs without an account.
          </li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <HighlightButton>Sign up</HighlightButton>
          <RegularButton>Log in</RegularButton>
        </div>
        <p className="mt-6 border-t border-[#2a3344] pt-4 text-[0.78rem] leading-relaxed text-[#8b95a8]">
          After sign-in (once built), you&apos;ll use in-app navigation — Jam, Songs, repertoire, Friends,
          Profile. Use <strong className="text-[#e8ecf4]">Log in</strong> when you already have an account.
        </p>
      </article>
    </div>
  );
}
