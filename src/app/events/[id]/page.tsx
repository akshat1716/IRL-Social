import { notFound } from "next/navigation";
import { getEventById } from "@/lib/actions/events";
import { EventDetail } from "@/components/events/event-detail";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const event = await getEventById(params.id);

  if (!event) {
    notFound();
  }

  return <EventDetail event={event} />;
}
