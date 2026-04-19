import { JamSessionPanel } from "@/app/(private)/app/jam/session/[sessionId]/JamSessionPanel";
import { getJamSessionDetails } from "@/lib/platform/jam-session-service";

type JamSessionPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function JamSessionPage({ params }: JamSessionPageProps) {
  const { sessionId } = await params;
  const details = await getJamSessionDetails(sessionId);

  return (
    <JamSessionPanel
      sessionId={details.sessionId}
      title={details.title}
      isOwner={details.isOwner}
      isParticipant={details.isParticipant}
      participants={details.participants}
      songs={details.songs}
      pendingJoinRequests={details.pendingJoinRequests}
      myJoinRequestStatus={details.myJoinRequestStatus}
    />
  );
}
