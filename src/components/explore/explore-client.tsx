"use client";

import { EventCard } from "@/components/events/event-card";
import { categoryLabels } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Event, EventCategory } from "@/types/database";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const categories: (EventCategory | "all")[] = [
  "all",
  "run_club",
  "mixer",
  "board_games",
  "nightlife",
  "karaoke",
];

interface ExploreClientProps {
  events: Event[];
}

export function ExploreClient({ events }: ExploreClientProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<EventCategory | "all">("all");

  const filtered = events.filter((event) => {
    const matchesSearch =
      !search ||
      event.title.toLowerCase().includes(search.toLowerCase()) ||
      event.venue?.location.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      category === "all" || event.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Explore</h1>
        <p className="text-sm text-white/50">Search all events</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <Input
          placeholder="Search events, venues..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
              category === cat
                ? "border-lime-400/50 bg-lime-400/10 text-lime-400"
                : "border-white/10 text-white/50 hover:text-white"
            )}
          >
            {cat === "all" ? "All" : categoryLabels[cat]}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            accent={event.is_daytime ? "lime" : "violet"}
          />
        ))}
        {filtered.length === 0 && (
          <p className="py-12 text-center text-white/40">No events found</p>
        )}
      </div>
    </div>
  );
}
