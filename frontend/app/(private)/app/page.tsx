import { redirect } from "next/navigation";

/** Default logged-in entry: open feed first. */
export default function AppIndexPage() {
  redirect("/app/feed");
}
