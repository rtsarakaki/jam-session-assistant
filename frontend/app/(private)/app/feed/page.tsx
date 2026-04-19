import { FeedPanel } from "./FeedPanel";
import { listFriendFeedPostsPage, requireAuthUser } from "@/lib/platform";

export default async function FeedPage() {
  const user = await requireAuthUser();
  const { items, nextCursor } = await listFriendFeedPostsPage({ limit: 30, cursor: null });

  return (
    <main className="min-w-0 max-w-full">
      <h2 className="m-0 text-lg font-semibold text-[#e8ecf4]">Feed</h2>
      <p className="mt-1 text-[0.7rem] leading-snug text-[#8b95a8]">
        Share gig invites, venue links, or videos. Only mutual friends (you follow each other) can see posts and
        comment.
      </p>
      <div className="mt-4">
        <FeedPanel myUserId={user.id} initialItems={items} initialNextCursor={nextCursor} />
      </div>
    </main>
  );
}
