import { categoryLabels, vibeLabels } from "@/lib/store";
import { cn, formatCurrency, formatDate, formatTime } from "@/lib/utils";
import type { Event } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MapPin, Clock, Users } from "lucide-react";
import Link from "next/link";

const coverGradients: Record<string, string> = {
  run: "from-lime-500/40 via-emerald-600/30 to-teal-900/60",
  coffee: "from-amber-500/40 via-orange-600/30 to-rose-900/60",
  club: "from-violet-500/40 via-purple-600/30 to-indigo-900/60",
  karaoke: "from-fuchsia-500/40 via-pink-600/30 to-violet-900/60",
  gig: "from-cyan-500/40 via-blue-600/30 to-violet-900/60",
  board: "from-emerald-500/40 via-teal-600/30 to-cyan-900/60",
};

interface EventCardProps {
  event: Event;
  accent?: "lime" | "violet";
}

export function EventCard({ event, accent = "lime" }: EventCardProps) {
  const capacityPercent = Math.round(
    (event.current_attendees / event.capacity) * 100
  );
  const vibe = vibeLabels[event.vibe_status];
  const minPrice =
    event.ticket_tiers?.reduce(
      (min, t) => Math.min(min, t.price),
      Infinity
    ) ?? 0;
  const gradient = coverGradients[event.cover_image] ?? coverGradients.run;

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="group overflow-hidden transition-all hover:border-white/20 hover:bg-white/[0.07]">
        <div
          className={cn(
            "relative h-36 bg-gradient-to-br",
            gradient
          )}
        >
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute left-3 top-3 flex gap-2">
            <Badge variant={accent === "lime" ? "lime" : "violet"}>
              {categoryLabels[event.category]}
            </Badge>
            {event.vibe_status === "sold_out" && (
              <Badge variant="red">Sold Out</Badge>
            )}
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-lg font-bold text-white drop-shadow-lg">
              {event.title}
            </h3>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-center gap-4 text-sm text-white/60">
            <span className="flex items-center gap-1" suppressHydrationWarning>
              <Clock className="h-3.5 w-3.5" />
              {formatDate(event.start_time)} · {formatTime(event.start_time)}
            </span>
          </div>

          {event.venue && (
            <div className="flex items-center gap-1 text-sm text-white/60">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {event.venue.name}, {event.venue.location}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className={cn("font-semibold", vibe.color)}>
                {capacityPercent}% Full · {vibe.label}
              </span>
              <span className="flex items-center gap-1 text-white/50">
                <Users className="h-3 w-3" />
                {event.current_attendees}/{event.capacity}
              </span>
            </div>
            <Progress
              value={capacityPercent}
              indicatorClassName={
                accent === "lime" ? "bg-lime-400" : "bg-violet-400"
              }
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-white/50">From</span>
            <span
              className={cn(
                "text-lg font-bold",
                accent === "lime" ? "text-lime-400" : "text-violet-400"
              )}
            >
              {minPrice === 0 ? "Free" : formatCurrency(minPrice)}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
