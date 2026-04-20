import { FeedPanel } from "./FeedPanel";
import { listFeedFollowSuggestions, listFriendFeedPostsPage, requireAuthUser } from "@/lib/platform";

export default async function FeedPage() {
  const user = await requireAuthUser();
  const { items, nextCursor } = await listFriendFeedPostsPage({ limit: 30, cursor: null });
  const followSuggestions = items.length === 0 ? await listFeedFollowSuggestions({ limit: 8 }) : [];

  return (
    <main className="w-full min-w-0 max-w-full overflow-x-hidden">
      <h2 className="m-0 text-lg font-semibold text-[#e8ecf4]">Feed</h2>
      <p className="mt-1 text-[0.7rem] leading-snug text-[#8b95a8]">
        Share gig invites, venue links, or videos. You see posts from everyone you follow — they don&apos;t need to
        follow you back.
      </p>
      <div className="mt-4">
        <FeedPanel
          myUserId={user.id}
          initialItems={items}
          initialNextCursor={nextCursor}
          initialFollowSuggestions={followSuggestions}
        />
      </div>
    </main>
  );
}
