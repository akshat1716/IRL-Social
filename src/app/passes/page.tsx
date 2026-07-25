import { getUserPasses } from "@/lib/actions/tickets";
import { PassesList } from "@/components/passes/passes-list";

export const dynamic = "force-dynamic";

export default async function PassesPage() {
  const passes = await getUserPasses();
  return <PassesList passes={passes} />;
}
