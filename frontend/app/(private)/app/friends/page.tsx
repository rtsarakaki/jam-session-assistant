import { FriendsPanel } from "@/app/(private)/app/friends/FriendsPanel";
import { DEFAULT_APP_LOCALE } from "@/lib/i18n/locales";
import { getMyProfile } from "@/lib/platform/profile-service";
import { getFriendsSnapshot } from "@/lib/platform/friends-service";

export const metadata = {
  title: "Amigos — Jam Session",
};

export default async function FriendsPage() {
  const [snapshot, profile] = await Promise.all([getFriendsSnapshot(), getMyProfile()]);
  const locale = profile?.preferredLocale ?? DEFAULT_APP_LOCALE;

  return <FriendsPanel snapshot={snapshot} locale={locale} />;
}
