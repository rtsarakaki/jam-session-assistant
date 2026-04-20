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
  videoEmbeds?: Array<{
    label: string;
    src: string;
  }>;
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
      "Follow this sequence to get useful jam suggestions fast.",
      "Start with your profile, then build your repertoire.",
      "Use Jam after setup to match songs with friends.",
    ],
    videoEmbeds: [
      {
        label: "Product walkthrough (English)",
        src: "https://www.youtube.com/embed/T55kLFCeSkg",
      },
      {
        label: "Product walkthrough (Portuguese)",
        src: "https://www.youtube.com/embed/KtWcGcpNkVg",
      },
    ],
    ctaLabel: "Start with Profile",
    ctaHref: "/app/profile",
  },
  {
    id: "profile",
    title: "Step 1: Set your instruments in Profile",
    description:
      "Open Profile and tell the app what you play. This improves who can find you and how your jam context is interpreted.",
    bullets: [
      "Select your instruments in the preset list.",
      "If you can adapt to anything, include the 'Any song (full repertoire)' option.",
      "Save profile before moving to repertoire.",
    ],
    ctaLabel: "Open Profile",
    ctaHref: "/app/profile",
  },
  {
    id: "repertoire",
    title: "Step 2: Build your playable repertoire",
    description:
      "In Repertoire, choose the songs you can actually play today. This is the core signal for jam matching.",
    bullets: [
      "Pick songs you are ready to perform now.",
      "If a song is missing, you can add it directly from Repertoire.",
      "Keep this list current so match scores stay accurate.",
    ],
    ctaLabel: "Open Repertoire",
    ctaHref: "/app/repertoire",
  },
  {
    id: "songs",
    title: "Step 3: Add missing songs when needed",
    description:
      "If you cannot find a song in Repertoire, add it either there or in the Songs catalog with the key references.",
    bullets: [
      "Songs is your shared catalog layer.",
      "Register title, artist, language, lyrics URL, and listen URL.",
      "Then return to Repertoire and mark that song as playable.",
    ],
    ctaLabel: "Open Songs",
    ctaHref: "/app/songs",
  },
  {
    id: "jam",
    title: "Step 4: Create or join a jam with friends",
    description:
      "After profile and repertoire are ready, open Jam to start sessions and get overlap-based suggestions for what to play.",
    bullets: [
      "Use Friends to follow people you play with.",
      "Open Jam and start a session with your group.",
      "Use the ranked suggestions to pick songs faster.",
      "Audience members can also join a jam and request songs through the app.",
    ],
    ctaLabel: "Open Jam",
    ctaHref: "/app/jam",
  },
  {
    id: "feed",
    title: "Step 5: Share on Feed",
    description:
      "After playing, use Feed to share performances, references, and songs you like so your friends keep discovering new ideas.",
    bullets: [
      "Post clips, links, and updates from your sessions.",
      "Share songs you enjoy to inspire your network.",
      "Use comments and likes to keep the musical conversation active.",
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
            {step.videoEmbeds?.length ? (
              <div className="mt-3 space-y-2.5">
                {step.videoEmbeds.map((video) => (
                  <div key={video.src} className="rounded-lg border border-[#2a3344] bg-[#111722] p-2">
                    <p className="mb-1.5 text-[0.68rem] font-semibold text-[#cfd5e3]">{video.label}</p>
                    <div className="relative overflow-hidden rounded-md border border-[#2a3344] pb-[56.25%]">
                      <iframe
                        src={video.src}
                        title={video.label}
                        className="absolute inset-0 h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

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
