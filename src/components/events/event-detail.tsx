"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckoutModal } from "@/components/events/checkout-modal";
import { categoryLabels, vibeLabels, isMatchmakingCategory } from "@/lib/store";
import { cn, formatCurrency, formatDate, formatTime } from "@/lib/utils";
import type { Event, Squad } from "@/types/database";
import { ArrowLeft, Clock, MapPin, Users, Zap, UserPlus, Dumbbell, Navigation } from "lucide-react";
import Link from "next/link";
import { OpenSquadModal } from "@/components/events/open-squad-modal";
import { getPublicSquadsForEvent } from "@/lib/actions/tickets";
import { mockSquads } from "@/lib/mock-data";

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
  const [openSquadModalOpen, setOpenSquadModalOpen] = useState(false);
  const [openSquads, setOpenSquads] = useState<Squad[]>([]);

  const isMatchmaking =
    isMatchmakingCategory(event.category) || event.is_matchmaking_enabled;

  useEffect(() => {
    if (!isMatchmaking) return;

    getPublicSquadsForEvent(event.id).then((squads) => {
      if (squads.length > 0) {
        setOpenSquads(squads);
      } else {
        // Fallback to mock squads matching this event id
        const matching = mockSquads.filter((s) => s.event_id === event.id);
        setOpenSquads(matching);
      }
    });
  }, [event.id, isMatchmaking]);

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
          <div className="flex items-start justify-between rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/60">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
              <div>
                <p className="font-medium text-white">{event.venue.name}</p>
                <p className="text-xs text-white/50">{event.venue.address}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const isApple =
                  typeof navigator !== "undefined" &&
                  /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
                const title = encodeURIComponent(event.venue?.name || "Venue");
                const lat = event.venue?.lat || 26.8515;
                const lng = event.venue?.lng || 80.9415;
                const url = isApple
                  ? `https://maps.apple.com/?q=${title}&ll=${lat},${lng}`
                  : `https://www.google.com/maps/search/?api=1&query=${title}+${lat},${lng}`;
                window.open(url, "_blank");
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-violet-500/20 px-2.5 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-500/30 hover:text-white shrink-0"
            >
              <Navigation className="h-3.5 w-3.5" />
              Directions
            </button>
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

        {/* Playo-Style Open Squad Matchmaking (Shown ONLY for sports & activities or when enabled) */}
        {isMatchmaking && (
          <div className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-amber-400 text-sm">
                  <Zap className="h-4 w-4 fill-amber-400" />
                  <span>Public Squad Matchmaking</span>
                </div>
                <p className="text-[11px] text-white/60">
                  Join an open match squad or host your own to split game fees
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOpenSquadModalOpen(true)}
                className="h-8 gap-1 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/20 shrink-0"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Host Squad (+1)
              </Button>
            </div>

            {event.equipment_provided && (
              <div className="rounded-xl bg-black/40 p-2.5 text-xs text-white/70 flex items-center gap-2 border border-white/5">
                <Dumbbell className="h-4 w-4 text-lime-400 shrink-0" />
                <span>{event.equipment_provided}</span>
              </div>
            )}

            {openSquads.length > 0 ? (
              <div className="space-y-2 pt-1">
                {openSquads.map((squad) => {
                  const maxCap = squad.max_members || event.max_squad_size || 4;
                  const currentCount = squad.member_pass_ids?.length || 1;
                  const spotsLeft = Math.max(0, maxCap - currentCount);

                  return (
                    <div
                      key={squad.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/90 p-3 shadow-md"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">
                            {squad.creator_name || "Community Host"}
                          </span>
                          <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-300 border border-violet-500/30">
                            {squad.skill_level || "Intermediate"}
                          </span>
                        </div>
                        {squad.notes && (
                          <p className="text-[11px] text-white/60 line-clamp-1">
                            &quot;{squad.notes}&quot;
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-[10px] text-white/40">
                          <span className="flex items-center gap-1 font-medium text-amber-400">
                            <Users className="h-3 w-3" />
                            {currentCount}/{maxCap} Players
                          </span>
                          <span>·</span>
                          <span className="text-lime-400 font-semibold">
                            {spotsLeft} spot{spotsLeft === 1 ? "" : "s"} left
                          </span>
                        </div>
                      </div>

                      <Link href={`/squad/${squad.share_code}`}>
                        <Button
                          size="sm"
                          variant="violet"
                          className="h-8 text-xs gap-1 font-semibold shadow-md"
                        >
                          Join Squad
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 p-3 text-center text-xs text-white/40">
                No active squads recruiting yet. Be the first to host an open squad!
              </div>
            )}
          </div>
        )}

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

      <OpenSquadModal
        event={event}
        isOpen={openSquadModalOpen}
        onClose={() => setOpenSquadModalOpen(false)}
        onSquadCreated={(newSquad) => {
          setOpenSquads((prev) => [newSquad, ...prev]);
        }}
      />
    </div>
  );
}
