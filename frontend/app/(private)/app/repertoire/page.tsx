import { RepertoirePanel } from "@/app/(private)/app/repertoire/RepertoirePanel";
import { getMyRepertoireSnapshot } from "@/lib/platform/repertoire-service";

export const metadata = {
  title: "Repertório — Jam Session",
};

export default async function RepertoirePage() {
  const snapshot = await getMyRepertoireSnapshot();
  return <RepertoirePanel initialCatalog={snapshot.catalog} initialEntries={snapshot.entries} />;
}
