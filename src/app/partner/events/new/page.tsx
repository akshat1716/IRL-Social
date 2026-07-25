"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { createEvent, getVenues } from "@/lib/actions/events";
import type { EventCategory, Venue } from "@/types/database";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";

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

  useEffect(() => {
    getVenues().then(setVenues);
  }, []);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "nightlife" as EventCategory,
    venue_id: "",
    start_time: "",
    end_time: "",
    capacity: 200,
    is_daytime: false,
    cover_image: "club",
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
                const isDaytime = ["run_club", "mixer", "board_games"].includes(
                  cat
                );
                setForm({
                  ...form,
                  category: cat,
                  is_daytime: isDaytime,
                  cover_image: isDaytime ? "coffee" : "club",
                });
              }}
            >
              <option value="run_club">Run Club</option>
              <option value="mixer">Mixer</option>
              <option value="board_games">Board Games</option>
              <option value="nightlife">Nightlife</option>
              <option value="karaoke">Karaoke</option>
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

        <div className="space-y-2">
          <Label>Venue</Label>
          <Select
            value={form.venue_id}
            onChange={(e) => setForm({ ...form, venue_id: e.target.value })}
          >
            <option value="">Select venue</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} — {v.location}
              </option>
            ))}
          </Select>
        </div>

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
