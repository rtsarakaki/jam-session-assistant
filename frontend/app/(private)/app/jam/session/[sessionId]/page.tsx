import { JamSessionPanel } from "@/app/(private)/app/jam/session/[sessionId]/JamSessionPanel";
import { DEFAULT_APP_LOCALE } from "@/lib/i18n/locales";
import { getJamSessionDetails } from "@/lib/platform/jam-session-service";
import { getMyProfile } from "@/lib/platform/profile-service";

type JamSessionPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function JamSessionPage({ params }: JamSessionPageProps) {
  const { sessionId } = await params;
  const details = await getJamSessionDetails(sessionId);
  const profile = await getMyProfile();
  const locale = profile?.preferredLocale ?? DEFAULT_APP_LOCALE;

  return (
    <JamSessionPanel
      locale={locale}
      sessionId={details.sessionId}
      title={details.title}
      createdBy={details.createdBy}
      viewerId={details.viewerId}
      isOwner={details.isOwner}
      isParticipant={details.isParticipant}
      participants={details.participants}
      songs={details.songs}
      pendingJoinRequests={details.pendingJoinRequests}
      myJoinRequestStatus={details.myJoinRequestStatus}
      jamMode={details.jamMode}
      setlistModeEnabled={details.setlistModeEnabled}
    />
  );
}
