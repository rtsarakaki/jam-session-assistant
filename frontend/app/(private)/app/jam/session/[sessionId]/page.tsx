import { JamSessionPanel } from "@/app/(private)/app/jam/session/[sessionId]/JamSessionPanel";
import { DEFAULT_APP_LOCALE } from "@/lib/i18n/locales";
import { getJamSessionDetails } from "@/lib/platform/jam-session-service";
import { getMyProfile } from "@/lib/platform/profile-service";

type JamSessionPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function JamSessionPage({ params }: JamSessionPageProps) {
  const { sessionId } = await params;
  const profile = await getMyProfile();
  const locale = profile?.preferredLocale ?? DEFAULT_APP_LOCALE;
  const result = await getJamSessionDetails(sessionId)
    .then((details) => ({ details, error: null as Error | null }))
    .catch((error) => ({ details: null, error: error instanceof Error ? error : new Error("Unknown error") }));
  if (result.error) {
    const jamMissing = result.error.message.toLowerCase().includes("session not found");
    if (!jamMissing) throw result.error;
    return (
      <main className="mx-auto w-full max-w-3xl pb-8">
        <section className="rounded-2xl border border-[#2a3344] bg-[#171c26] p-5 shadow-[0_12px_28px_rgba(0,0,0,0.22)]">
          <h2 className="m-0 text-lg font-semibold text-[#e8ecf4]">{locale === "pt" ? "Jam indisponível" : "Jam unavailable"}</h2>
          <p className="mt-2 text-sm text-[#8b95a8]">
            {locale === "pt"
              ? "Esta jam não existe mais. Ela pode ter sido apagada."
              : "This jam no longer exists. It may have been deleted."}
          </p>
        </section>
      </main>
    );
  }
  const details = result.details;
  if (!details) return null;
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
