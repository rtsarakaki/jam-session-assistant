import { notFound } from "next/navigation";
import { UserChannelPanel } from "./UserChannelPanel";
import { DEFAULT_APP_LOCALE } from "@/lib/i18n/locales";
import { getMyProfile } from "@/lib/platform/profile-service";
import { getUserChannelSnapshot, isUuidLike } from "@/lib/platform/user-channel-service";

type UserChannelPageProps = {
  params: Promise<{ userId: string }>;
};

export async function generateMetadata({ params }: UserChannelPageProps) {
  const { userId } = await params;
  if (!isUuidLike(userId)) {
    return { title: "Activities — Jam Session" };
  }
  try {
    const snapshot = await getUserChannelSnapshot(userId);
    if (!snapshot.profile) {
      return { title: "Activities — Jam Session" };
    }
    return { title: `${snapshot.profile.listName} — Jam Session` };
  } catch {
    return { title: "Activities — Jam Session" };
  }
}

export default async function UserChannelPage({ params }: UserChannelPageProps) {
  const { userId } = await params;
  if (!isUuidLike(userId)) {
    notFound();
  }
  const me = await getMyProfile();
  const locale = me?.preferredLocale ?? DEFAULT_APP_LOCALE;
  const snapshot = await getUserChannelSnapshot(userId);
  if (!snapshot.profile) {
    notFound();
  }
  return <UserChannelPanel locale={locale} snapshot={snapshot} />;
}
