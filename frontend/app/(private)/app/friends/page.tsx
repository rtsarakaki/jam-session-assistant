import { FriendsPanel } from "@/app/(private)/app/friends/FriendsPanel";
import { getFriendsSnapshot } from "@/lib/platform/friends-service";

export const metadata = {
  title: "Amigos — Jam Session",
};

export default async function FriendsPage() {
  const snapshot = await getFriendsSnapshot();

  return <FriendsPanel snapshot={snapshot} />;
}
