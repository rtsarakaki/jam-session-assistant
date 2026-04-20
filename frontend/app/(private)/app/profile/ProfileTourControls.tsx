"use client";

import { useState } from "react";
import {
  clearOnboardingShownInSession,
  ONBOARDING_OPEN_EVENT,
} from "@/lib/onboarding/walkthrough-session";

type ProfileTourControlsProps = {
  userId: string | null;
};

export function ProfileTourControls({ userId }: ProfileTourControlsProps) {
  const [done, setDone] = useState(false);

  function replayTour() {
    if (!userId) return;
    clearOnboardingShownInSession(userId);
    window.dispatchEvent(new Event(ONBOARDING_OPEN_EVENT));
    setDone(true);
  }

  return (
    <section className="mt-6 rounded-xl border border-[#2a3344] bg-[#171c26]/60 p-3">
      <h2 className="m-0 text-sm font-semibold text-[#e8ecf4]">Tutorial</h2>
      <p className="mt-1 text-[0.75rem] leading-snug text-[#8b95a8]">
        Want to see the onboarding again in this session? You can reopen it anytime.
      </p>
      <button
        type="button"
        onClick={replayTour}
        disabled={!userId}
        className="mt-3 rounded-lg border border-[color-mix(in_srgb,#6ee7b7_45%,#2a3344)] bg-[#6ee7b7] px-3 py-1.5 text-[0.75rem] font-semibold text-[#0f1218] transition-colors hover:bg-[#5eead4] disabled:cursor-not-allowed disabled:opacity-60"
      >
        Show onboarding tour
      </button>
      {done ? <p className="mt-2 text-[0.68rem] text-[#86efac]">Tour reopened.</p> : null}
    </section>
  );
}
