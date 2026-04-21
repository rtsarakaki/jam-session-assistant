import { FeedPanel } from "./FeedPanel";
import { DEFAULT_APP_LOCALE } from "@/lib/i18n/locales";
import { listFriendFeedPostsPage, requireAuthUser } from "@/lib/platform";
import { listUpcomingAgendaEventsForFeed } from "@/lib/platform/agenda-service";
import { getMyProfile } from "@/lib/platform/profile-service";

export default async function FeedPage() {
  const user = await requireAuthUser();
  const profile = await getMyProfile();
  const locale = profile?.preferredLocale ?? DEFAULT_APP_LOCALE;
  const { items, nextCursor } = await listFriendFeedPostsPage({ limit: 30, cursor: null });
  const upcomingEvents = await listUpcomingAgendaEventsForFeed();

  return (
    <main className="w-full min-w-0 max-w-full overflow-x-hidden">
      <h2 className="m-0 text-lg font-semibold text-[#e8ecf4]">Feed</h2>
      <p className="mt-1 text-[0.7rem] leading-snug text-[#8b95a8]">
        {locale === "pt"
          ? "Compartilhe convites de show, links de locais ou vídeos. Você vê posts de todos que segue — eles não precisam seguir você de volta."
          : "Share gig invites, venue links, or videos. You see posts from everyone you follow - they do not need to follow you back."}
      </p>
      <div className="mt-4">
        <FeedPanel
          myUserId={user.id}
          initialItems={items}
          initialNextCursor={nextCursor}
          initialUpcomingEvents={upcomingEvents}
          locale={locale}
        />
      </div>
    </main>
  );
}
