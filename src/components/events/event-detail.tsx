"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckoutModal } from "@/components/events/checkout-modal";
import { categoryLabels, vibeLabels } from "@/lib/store";
import { cn, formatCurrency, formatDate, formatTime } from "@/lib/utils";
import type { Event } from "@/types/database";
import { ArrowLeft, Clock, MapPin, Users } from "lucide-react";
import Link from "next/link";

const coverGradients: Record<string, string> = {
  run: "from-lime-500/60 via-emerald-600/40 to-teal-900/80",
  coffee: "from-amber-500/60 via-orange-600/40 to-rose-900/80",
  club: "from-violet-500/60 via-purple-600/40 to-indigo-900/80",
  karaoke: "from-fuchsia-500/60 via-pink-600/40 to-violet-900/80",
  gig: "from-cyan-500/60 via-blue-600/40 to-violet-900/80",
  board: "from-emerald-500/60 via-teal-600/40 to-cyan-900/80",
};

interface EventDetailProps {
  event: Event;
}

export function EventDetail({ event }: EventDetailProps) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const capacityPercent = Math.round(
    (event.current_attendees / event.capacity) * 100
  );
  const vibe = vibeLabels[event.vibe_status];
  const gradient = coverGradients[event.cover_image] ?? coverGradients.run;
  const minPrice =
    event.ticket_tiers?.reduce((min, t) => Math.min(min, t.price), Infinity) ??
    0;
  const isSoldOut = event.vibe_status === "sold_out";

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div
        className={cn("relative -mx-4 h-56 bg-gradient-to-br", gradient)}
      >
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="mb-2 flex gap-2">
            <Badge variant={event.is_daytime ? "lime" : "violet"}>
              {categoryLabels[event.category]}
            </Badge>
            <Badge variant="default" className={vibe.color}>
              {vibe.label}
            </Badge>
          </div>
          <h1 className="text-2xl font-black text-white">{event.title}</h1>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3 text-sm text-white/60">
          <Clock className="h-4 w-4 shrink-0" />
          <span suppressHydrationWarning>
            {formatDate(event.start_time)} · {formatTime(event.start_time)} –{" "}
            {formatTime(event.end_time)}
          </span>
        </div>

        {event.venue && (
          <div className="flex items-start gap-3 text-sm text-white/60">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium text-white">{event.venue.name}</p>
              <p>{event.venue.address}</p>
            </div>
          </div>
        )}

        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className={cn("font-semibold", vibe.color)}>
              {capacityPercent}% Full
            </span>
            <span className="flex items-center gap-1 text-white/50">
              <Users className="h-3.5 w-3.5" />
              {event.current_attendees}/{event.capacity}
            </span>
          </div>
          <Progress
            value={capacityPercent}
            indicatorClassName={
              event.is_daytime ? "bg-lime-400" : "bg-violet-400"
            }
          />
        </div>

        <div>
          <h2 className="mb-2 font-bold text-white">About</h2>
          <p className="text-sm leading-relaxed text-white/60">
            {event.description}
          </p>
        </div>

        <div>
          <h2 className="mb-3 font-bold text-white">Passes</h2>
          <div className="space-y-2">
            {event.ticket_tiers?.map((tier) => (
              <div
                key={tier.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <div>
                  <p className="font-semibold text-white">{tier.name}</p>
                  <p className="text-xs text-white/50">{tier.description}</p>
                </div>
                <p className="font-bold text-white">
                  {tier.price === 0 ? "Free" : formatCurrency(tier.price)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-20 left-0 right-0 mx-auto max-w-lg px-4">
        <Button
          className="w-full shadow-lg"
          variant={event.is_daytime ? "default" : "violet"}
          size="lg"
          disabled={isSoldOut}
          onClick={() => setCheckoutOpen(true)}
        >
          {isSoldOut
            ? "Sold Out"
            : minPrice === 0
              ? "RSVP Free"
              : `Get Pass · From ${formatCurrency(minPrice)}`}
        </Button>
      </div>

      <CheckoutModal
        event={event}
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
      />
    </div>
  );
}
