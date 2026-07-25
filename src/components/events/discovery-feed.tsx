"use client";

import { useQuery } from "@tanstack/react-query";
import { EventCard } from "@/components/events/event-card";
import { getEvents } from "@/lib/actions/events";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Event } from "@/types/database";
import { Loader2, Sparkles } from "lucide-react";

interface DiscoveryFeedProps {
  initialEvents?: Event[];
}

export function DiscoveryFeed({ initialEvents }: DiscoveryFeedProps) {
  const { feedMode, setFeedMode } = useAppStore();
  const isDaytime = feedMode === "daytime";

  const { data: events, isLoading } = useQuery({
    queryKey: ["events", feedMode],
    queryFn: () => getEvents(feedMode),
    initialData:
      initialEvents && feedMode === "daytime" ? initialEvents : undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Discover
          </h1>
          <p className="text-sm text-white/50">Find your next IRL moment</p>
        </div>
        <Sparkles
          className={cn(
            "h-6 w-6",
            isDaytime ? "text-lime-400" : "text-violet-400"
          )}
        />
      </div>

      <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1">
        <button
          onClick={() => setFeedMode("daytime")}
          className={cn(
            "flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all",
            isDaytime
              ? "bg-lime-400 text-black shadow-lg shadow-lime-400/20"
              : "text-white/60 hover:text-white"
          )}
        >
          ☀️ Daytime Socials
        </button>
        <button
          onClick={() => setFeedMode("nightlife")}
          className={cn(
            "flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all",
            !isDaytime
              ? "bg-violet-500 text-white shadow-lg shadow-violet-500/20"
              : "text-white/60 hover:text-white"
          )}
        >
          🌙 Nightlife
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-white/40" />
        </div>
      ) : (
        <div className="space-y-4 pb-4">
          {events?.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              accent={isDaytime ? "lime" : "violet"}
            />
          ))}
          {events?.length === 0 && (
            <p className="py-12 text-center text-white/40">
              No events found. Check back soon!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
