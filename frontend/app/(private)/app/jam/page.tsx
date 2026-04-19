import { JamPanel } from "@/app/(private)/app/jam/JamPanel";
import { getJamSuggestionSnapshot } from "@/lib/platform/jam-service";

export const metadata = {
  title: "Jam — Jam Session Assistant",
};

export default async function JamPage() {
  const snapshot = await getJamSuggestionSnapshot();
  return (
    <JamPanel
      currentUser={snapshot.currentUser}
      defaultSelectedParticipantIds={snapshot.defaultSelectedParticipantIds}
      songs={snapshot.songs}
      recentSessions={snapshot.recentSessions}
    />
  );
}
