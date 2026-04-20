"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";
import {
  markOnboardingShownInSession,
  ONBOARDING_OPEN_EVENT,
  wasOnboardingShownInSession,
} from "@/lib/onboarding/walkthrough-session";

type WalkthroughStep = {
  id: string;
  title: string;
  description: string;
  bullets: string[];
  ctaLabel?: string;
  ctaHref?: string;
};

const steps: WalkthroughStep[] = [
  {
    id: "welcome",
    title: "Welcome to Jam Session",
    description:
      "This app helps musicians quickly discover what they can play together, avoid setup delays, and keep live sessions flowing.",
    bullets: [
      "Map each member's song repertoire in one place.",
      "Surface songs with the highest group overlap first.",
      "Keep supporting links and session updates inside the same workflow.",
    ],
    ctaLabel: "Start with Jam",
    ctaHref: "/app/jam",
  },
  {
    id: "songs",
    title: "Build a reliable song base",
    description: "Use Songs and Repertoire together: Songs is the catalog, Repertoire is what you can actually perform.",
    bullets: [
      "Add title, artist, language, lyrics URL, and listen URL in Songs.",
      "Mark songs in Repertoire to reflect your current playable set.",
      "Keep entries updated to improve matching quality for everyone.",
    ],
    ctaLabel: "Open Songs",
    ctaHref: "/app/songs",
  },
  {
    id: "jam",
    title: "Find fast group matches",
    description:
      "Jam computes shared songs and prioritizes what more people can play, so groups reach a first song faster.",
    bullets: [
      "Open Jam to see suggested songs for the current group.",
      "Higher score means stronger overlap among participants.",
      "Use this as the default starting point before discussing edge cases.",
    ],
    ctaLabel: "Open Jam",
    ctaHref: "/app/jam",
  },
  {
    id: "network",
    title: "Expand your network and updates",
    description: "Friends and Feed keep discovery and communication active between sessions.",
    bullets: [
      "Follow musicians in Friends to grow your collaboration graph.",
      "Use Feed for invites, clips, references, and quick context.",
      "Like and comment to keep session context alive asynchronously.",
    ],
    ctaLabel: "Open Feed",
    ctaHref: "/app/feed",
  },
];

/** Friendly walkthrough for core app workflows. */
export function AppOnboardingWalkthrough({ userId }: { userId: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const step = steps[stepIdx] ?? steps[0];
  const isLast = stepIdx === steps.length - 1;

  useEffect(() => {
    if (!wasOnboardingShownInSession(userId)) {
      markOnboardingShownInSession(userId);
      startTransition(() => setOpen(true));
    }
    function onOpenRequest() {
      startTransition(() => setOpen(true));
    }
    window.addEventListener(ONBOARDING_OPEN_EVENT, onOpenRequest);
    return () => {
      window.removeEventListener(ONBOARDING_OPEN_EVENT, onOpenRequest);
    };
  }, [userId]);

  const routeHint = useMemo(() => {
    if (pathname.startsWith("/app/jam")) return "You are currently in Jam.";
    if (pathname.startsWith("/app/songs")) return "You are currently in Songs.";
    if (pathname.startsWith("/app/repertoire")) return "You are currently in Repertoire.";
    if (pathname.startsWith("/app/friends")) return "You are currently in Friends.";
    if (pathname.startsWith("/app/feed")) return "You are currently in Feed.";
    return "Use the bottom dock to navigate each area.";
  }, [pathname]);

  function closeWalkthrough() {
    setOpen(false);
    setStepIdx(0);
  }

  function finishWalkthrough() {
    closeWalkthrough();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-[max(0.9rem,env(safe-area-inset-right,0px))] top-[max(0.9rem,env(safe-area-inset-top,0px))] z-[56] flex h-9 w-9 items-center justify-center rounded-full border border-[#2a3344] bg-[#171c26]/95 text-[0.8rem] font-semibold text-[#d5dbe8] shadow-[0_4px_14px_rgba(0,0,0,0.35)] transition-colors hover:border-[#6ee7b7]/55 hover:text-[#ffffff]"
        aria-label="Open onboarding tutorial"
        title="How this app works"
      >
        ?
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-onboarding-title"
        >
          <div className="w-full max-w-lg rounded-xl border border-[#2a3344] bg-[#171c26] p-4 text-[#e8ecf4] shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="m-0 text-[0.65rem] font-semibold uppercase tracking-wide text-[#6ee7b7]/85">
                  Step {stepIdx + 1} of {steps.length}
                </p>
                <h3 id="app-onboarding-title" className="mt-1 text-base font-semibold leading-snug">
                  {step.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeWalkthrough}
                className="rounded-md px-2 py-1 text-[0.72rem] font-semibold text-[#8b95a8] hover:bg-[#1e2533] hover:text-[#e8ecf4]"
              >
                Close
              </button>
            </div>

            <p className="mt-3 text-[0.78rem] leading-snug text-[#cfd5e3]">{step.description}</p>
            <ul className="mt-3 space-y-1.5 pl-4 text-[0.74rem] leading-snug text-[#aeb8cb]">
              {step.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <p className="mt-3 text-[0.68rem] text-[#8b95a8]">{routeHint}</p>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStepIdx((idx) => Math.max(0, idx - 1))}
                  disabled={stepIdx === 0}
                  className="rounded-md border border-[#2a3344] px-2.5 py-1.5 text-[0.72rem] font-semibold text-[#c7cfde] hover:bg-[#1e2533] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Back
                </button>
                {!isLast ? (
                  <button
                    type="button"
                    onClick={() => setStepIdx((idx) => Math.min(steps.length - 1, idx + 1))}
                    className="rounded-md border border-[color-mix(in_srgb,#6ee7b7_45%,#2a3344)] bg-[#6ee7b7] px-2.5 py-1.5 text-[0.72rem] font-semibold text-[#0f1218] hover:bg-[#5eead4]"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={finishWalkthrough}
                    className="rounded-md border border-[color-mix(in_srgb,#6ee7b7_45%,#2a3344)] bg-[#6ee7b7] px-2.5 py-1.5 text-[0.72rem] font-semibold text-[#0f1218] hover:bg-[#5eead4]"
                  >
                    Finish
                  </button>
                )}
              </div>

              {step.ctaHref && step.ctaLabel ? (
                <Link
                  href={step.ctaHref}
                  onClick={closeWalkthrough}
                  className="rounded-md border border-[#2a3344] px-2.5 py-1.5 text-[0.72rem] font-semibold text-[#6ee7b7] hover:bg-[#1e2533]"
                >
                  {step.ctaLabel}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
