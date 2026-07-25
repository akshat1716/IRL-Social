import { getEvents } from "@/lib/actions/events";
import { DiscoveryFeed } from "@/components/events/discovery-feed";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialEvents = await getEvents("daytime");
  return <DiscoveryFeed initialEvents={initialEvents} />;
}
