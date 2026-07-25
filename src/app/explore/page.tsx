import { getEvents } from "@/lib/actions/events";
import { ExploreClient } from "@/components/explore/explore-client";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const events = await getEvents();
  return <ExploreClient events={events} />;
}
