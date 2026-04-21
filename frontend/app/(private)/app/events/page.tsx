import { EventsPanel } from "./EventsPanel";
import { DEFAULT_APP_LOCALE } from "@/lib/i18n/locales";
import { requireAuthUser } from "@/lib/platform";
import { listUpcomingAgendaEventsAll } from "@/lib/platform/agenda-service";
import { getMyProfile } from "@/lib/platform/profile-service";
import { createSessionBoundDataClient } from "@/lib/platform/database";

export default async function EventsPage() {
  const user = await requireAuthUser();
  const profile = await getMyProfile();
  const locale = profile?.preferredLocale ?? DEFAULT_APP_LOCALE;
  const items = await listUpcomingAgendaEventsAll(150);
  const client = await createSessionBoundDataClient();
  const { data: myFollows } = await client
    .from("profile_follows")
    .select("following_id")
    .eq("follower_id", user.id);
  const followingIds = (myFollows ?? []).map((r) => (r as { following_id: string }).following_id);
  return <EventsPanel locale={locale} myUserId={user.id} initialItems={items} initialFollowingIds={followingIds} />;
}
