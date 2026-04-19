import { FriendsPanel } from "@/app/(private)/app/friends/FriendsPanel";
import { getFriendsSnapshot } from "@/lib/platform/friends-service";

export const metadata = {
  title: "Friends — Jam Session Assistant",
};

export default async function FriendsPage() {
  const snapshot = await getFriendsSnapshot();

  return <FriendsPanel snapshot={snapshot} />;
}
