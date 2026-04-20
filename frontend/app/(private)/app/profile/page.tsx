import { ProfileForm } from "@/app/(private)/app/profile/ProfileForm";
import { DEFAULT_APP_LOCALE } from "@/lib/i18n/locales";
import { requireAuthUser } from "@/lib/platform/session";
import { getMyProfile } from "@/lib/platform/profile-service";

export const metadata = {
  title: "Perfil — Jam Session",
};

export default async function ProfilePage() {
  const user = await requireAuthUser();
  const profile = await getMyProfile();
  const locale = profile?.preferredLocale ?? DEFAULT_APP_LOCALE;

  return <ProfileForm key={`${user.id}:${profile?.updatedAt ?? "new"}`} initial={profile} userId={user.id} locale={locale} />;
}
