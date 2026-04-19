import { redirect } from "next/navigation";

/** Default logged-in entry: same first tab as the dock (Jam). */
export default function AppIndexPage() {
  redirect("/app/jam");
}
