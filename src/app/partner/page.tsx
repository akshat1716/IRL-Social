import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getEvents } from "@/lib/actions/events";
import { categoryLabels } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  BarChart3,
  Calendar,
  ChevronRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PartnerPortalPage() {
  const events = await getEvents();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/profile" className="text-white/60 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-white">Partner Portal</h1>
          <p className="text-sm text-white/50">Manage your venues & events</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/partner/events/new">
          <Card className="transition-all hover:border-violet-400/30 hover:bg-violet-500/5">
            <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
              <Plus className="h-8 w-8 text-violet-400" />
              <p className="text-sm font-semibold text-white">Create Event</p>
              <p className="text-xs text-white/40">Under 2 minutes</p>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
            <BarChart3 className="h-8 w-8 text-cyan-400" />
            <p className="text-sm font-semibold text-white">Analytics</p>
            <p className="text-xs text-white/40">Live dashboards</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/60">Your Events</h2>
          <Calendar className="h-4 w-4 text-white/40" />
        </div>

        {events.map((event) => (
          <Link key={event.id} href={`/partner/dashboard/${event.id}`}>
            <Card className="mb-2 transition-all hover:border-white/20 hover:bg-white/[0.07]">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-1">
                  <p className="font-semibold text-white">{event.title}</p>
                  <p className="text-xs text-white/50">
                    {formatDate(event.start_time)} · {event.venue?.name}
                  </p>
                  <div className="mt-1 flex gap-2">
                    <Badge variant={event.is_daytime ? "lime" : "violet"}>
                      {categoryLabels[event.category]}
                    </Badge>
                    <Badge variant="default">
                      {event.current_attendees}/{event.capacity}
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-white/30" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
