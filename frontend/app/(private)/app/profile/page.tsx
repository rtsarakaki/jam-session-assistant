import { ProfileForm } from "@/app/(private)/app/profile/ProfileForm";
import { getMyProfile } from "@/lib/platform/profile-service";

export const metadata = {
  title: "Profile — Jam Session",
};

export default async function ProfilePage() {
  const profile = await getMyProfile();

  return <ProfileForm key={profile?.updatedAt ?? "new"} initial={profile} />;
}
