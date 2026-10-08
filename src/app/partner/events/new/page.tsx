"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { createEvent, getVenues } from "@/lib/actions/events";
import { getPayoutDetails, type PayoutDetails } from "@/lib/actions/auth";
import type { EventCategory, Venue } from "@/types/database";
import { ArrowLeft, Plus, Trash2, Building2, MapPin } from "lucide-react";
import { useEffect } from "react";
import { VenueMapPicker } from "@/components/partner/venue-map-picker";

interface TierForm {
  name: string;
  description: string;
  price: number;
  cover_redeemable_amount: number;
  max_quantity: number;
}

const defaultTier: TierForm = {
  name: "Stag Pass",
  description: "Entry + bar credit",
  price: 999,
  cover_redeemable_amount: 500,
  max_quantity: 100,
};

export default function NewEventPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [payoutDetails, setPayoutDetails] = useState<PayoutDetails | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);

  useEffect(() => {
    getVenues().then(setVenues);
    getPayoutDetails().then(setPayoutDetails);
  }, []);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "badminton" as EventCategory,
    venue_id: "",
    start_time: "",
    end_time: "",
    capacity: 200,
    is_daytime: true,
    cover_image: "coffee",
    is_matchmaking_enabled: true,
    skill_level: "all" as const,
    equipment_provided: "",
    max_squad_size: 4,
  });

  const [tiers, setTiers] = useState<TierForm[]>([
    {
      ...defaultTier,
      name: "Free RSVP",
      price: 0,
      cover_redeemable_amount: 0,
      description: "Entry only",
    },
    { ...defaultTier },
  ]);

  const createMutation = useMutation({
    mutationFn: () => createEvent({ ...form, tiers }),
    onSuccess: (event) => {
      if (event) router.push(`/partner/dashboard/${event.id}`);
    },
  });

  const addTier = () => setTiers([...tiers, { ...defaultTier }]);

  const removeTier = (index: number) => {
    if (tiers.length <= 1) return;
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const updateTier = (
    index: number,
    field: keyof TierForm,
    value: string | number
  ) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    setTiers(updated);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Link href="/partner" className="text-white/60 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-white">Create Event</h1>
          <p className="text-xs text-white/50">Build in under 2 minutes</p>
        </div>
      </div>

      {/* Payout Account Notice */}
      <div className="flex items-center justify-between rounded-xl border border-lime-400/30 bg-lime-400/5 p-3 text-xs">
        <div className="flex items-center gap-2 text-lime-400 font-semibold">
          <Building2 className="h-4 w-4 shrink-0" />
          <span>
            {payoutDetails?.upi_id
              ? `Payouts linked to: ${payoutDetails.upi_id}`
              : payoutDetails?.account_number
                ? `Payouts linked to Bank Account (•••• ${payoutDetails.account_number.slice(-4)})`
                : "No payout account set. Add UPI/Bank in Partner Portal."}
          </span>
        </div>
        <Link
          href="/partner"
          className="text-xs font-bold text-white underline hover:text-lime-300 shrink-0"
        >
          Manage Payouts
        </Link>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Event Title</Label>
          <Input
            placeholder="Neon Nights: DJ Set"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            placeholder="Describe your event..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={form.category}
              onChange={(e) => {
                const cat = e.target.value as EventCategory;
                const isDaytime = [
                  "badminton",
                  "football",
                  "pickleball",
                  "cricket",
                  "basketball",
                  "run_club",
                  "mixer",
                  "board_games",
                  "sports",
                ].includes(cat);
                const isSport = [
                  "badminton",
                  "football",
                  "pickleball",
                  "cricket",
                  "basketball",
                  "run_club",
                  "board_games",
                  "sports",
                ].includes(cat);
                setForm({
                  ...form,
                  category: cat,
                  is_daytime: isDaytime,
                  cover_image: isDaytime ? "coffee" : "club",
                  is_matchmaking_enabled: isSport,
                });
              }}
            >
              <option value="badminton">🏸 Badminton</option>
              <option value="football">⚽ Turf Football</option>
              <option value="pickleball">🏓 Pickleball</option>
              <option value="cricket">🏏 Box Cricket</option>
              <option value="basketball">🏀 Basketball</option>
              <option value="run_club">🏃 Run Club</option>
              <option value="board_games">🎲 Board Games</option>
              <option value="sports">🏆 Sports & Fitness</option>
              <option value="nightlife">🍸 Nightlife</option>
              <option value="karaoke">🎤 Karaoke</option>
              <option value="mixer">🥂 Mixer</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Capacity</Label>
            <Input
              type="number"
              value={form.capacity}
              onChange={(e) =>
                setForm({ ...form, capacity: parseInt(e.target.value) || 0 })
              }
            />
          </div>
        </div>

        {/* Playo-Style Open Squad Matchmaking Settings (Shown for sports/activities or when toggled) */}
        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">⚡</span>
              <div>
                <Label className="font-bold text-white text-sm">
                  Open Squad Public Matchmaking
                </Label>
                <p className="text-[11px] text-white/60">
                  Allow solo players to find teammates and split squad bookings
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={form.is_matchmaking_enabled}
              onChange={(e) =>
                setForm({ ...form, is_matchmaking_enabled: e.target.checked })
              }
              className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-violet-500 focus:ring-violet-500"
            />
          </div>

          {form.is_matchmaking_enabled && (
            <div className="space-y-3 pt-2 border-t border-violet-500/20 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-white/70 text-[11px]">Skill Level</Label>
                  <Select
                    value={form.skill_level}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        skill_level: e.target.value as any,
                      })
                    }
                    className="h-8 bg-zinc-900 text-xs"
                  >
                    <option value="all">🌟 All Levels Welcome</option>
                    <option value="beginner">🌱 Beginner Friendly</option>
                    <option value="intermediate">⚡ Intermediate (Casual)</option>
                    <option value="advanced">🔥 Competitive / Advanced</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-white/70 text-[11px]">
                    Default Squad Capacity
                  </Label>
                  <Input
                    type="number"
                    value={form.max_squad_size}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        max_squad_size: parseInt(e.target.value) || 4,
                      })
                    }
                    className="h-8 bg-zinc-900 text-xs text-white"
                    placeholder="e.g. 4 for doubles, 10 for football"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-white/70 text-[11px]">
                  Equipment & Amenities Provided
                </Label>
                <Input
                  value={form.equipment_provided}
                  onChange={(e) =>
                    setForm({ ...form, equipment_provided: e.target.value })
                  }
                  className="h-8 bg-zinc-900 text-xs text-white"
                  placeholder="e.g. Mavis 350 shuttles provided, bring your own racquet"
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Venue</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMapOpen(true)}
              className="h-7 gap-1.5 text-xs text-violet-300 border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-200"
            >
              <MapPin className="h-3.5 w-3.5" />
              Pick on Map / Add Venue
            </Button>
          </div>
          <Select
            value={form.venue_id}
            onChange={(e) => setForm({ ...form, venue_id: e.target.value })}
          >
            <option value="">
              {venues.length === 0
                ? "No venue selected. Click 'Pick on Map' to add one"
                : `Select venue (${venues.length} available)`}
            </option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} — {v.location}
              </option>
            ))}
          </Select>
          {form.venue_id && (
            <div className="flex items-start gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 p-2.5 text-xs">
              <MapPin className="h-4 w-4 shrink-0 text-violet-400 mt-0.5" />
              <div>
                <div className="font-semibold text-white">
                  {venues.find((v) => v.id === form.venue_id)?.name}
                </div>
                <div className="text-white/60">
                  {venues.find((v) => v.id === form.venue_id)?.address ||
                    venues.find((v) => v.id === form.venue_id)?.location}
                </div>
              </div>
            </div>
          )}
        </div>

        <VenueMapPicker
          isOpen={isMapOpen}
          onClose={() => setIsMapOpen(false)}
          existingVenues={venues}
          onVenueCreated={(newVenue) => {
            setVenues((prev) => [newVenue, ...prev]);
            setForm((prev) => ({ ...prev, venue_id: newVenue.id }));
          }}
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Start Time</Label>
            <Input
              type="datetime-local"
              value={form.start_time}
              onChange={(e) =>
                setForm({ ...form, start_time: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>End Time</Label>
            <Input
              type="datetime-local"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-white">Ticket Tiers</h2>
          <Button size="sm" variant="outline" onClick={addTier}>
            <Plus className="h-4 w-4" />
            Add Tier
          </Button>
        </div>

        {tiers.map((tier, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white/60">
                  Tier {index + 1}
                </span>
                {tiers.length > 1 && (
                  <button onClick={() => removeTier(index)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                )}
              </div>
              <Input
                placeholder="Tier name"
                value={tier.name}
                onChange={(e) => updateTier(index, "name", e.target.value)}
              />
              <Input
                placeholder="Description"
                value={tier.description}
                onChange={(e) =>
                  updateTier(index, "description", e.target.value)
                }
              />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Price (₹)</Label>
                  <Input
                    type="number"
                    value={tier.price}
                    onChange={(e) =>
                      updateTier(index, "price", parseInt(e.target.value) || 0)
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Cover (₹)</Label>
                  <Input
                    type="number"
                    value={tier.cover_redeemable_amount}
                    onChange={(e) =>
                      updateTier(
                        index,
                        "cover_redeemable_amount",
                        parseInt(e.target.value) || 0
                      )
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Max Qty</Label>
                  <Input
                    type="number"
                    value={tier.max_quantity}
                    onChange={(e) =>
                      updateTier(
                        index,
                        "max_quantity",
                        parseInt(e.target.value) || 0
                      )
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        className="w-full"
        variant="violet"
        size="lg"
        disabled={
          !form.title ||
          !form.venue_id ||
          !form.start_time ||
          createMutation.isPending
        }
        onClick={() => createMutation.mutate()}
      >
        {createMutation.isPending ? "Creating..." : "Publish Event"}
      </Button>
    </div>
  );
}
