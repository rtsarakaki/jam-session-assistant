import { ProfileForm } from "@/app/(private)/app/profile/ProfileForm";
import { requireAuthUser } from "@/lib/platform/session";
import { getMyProfile } from "@/lib/platform/profile-service";

export const metadata = {
  title: "Perfil — Jam Session",
};

export default async function ProfilePage() {
  const user = await requireAuthUser();
  const profile = await getMyProfile();

  return <ProfileForm key={`${user.id}:${profile?.updatedAt ?? "new"}`} initial={profile} userId={user.id} />;
}
