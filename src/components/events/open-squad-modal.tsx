"use client";

import { useState } from "react";
import { X, Users, Zap, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import type { Event, Squad } from "@/types/database";
import { createPublicOpenSquad } from "@/lib/actions/tickets";
import { useRouter } from "next/navigation";

interface OpenSquadModalProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
  onSquadCreated?: (squad: Squad) => void;
}

export function OpenSquadModal({
  event,
  isOpen,
  onClose,
  onSquadCreated,
}: OpenSquadModalProps) {
  const router = useRouter();
  const [tierId, setTierId] = useState(event.ticket_tiers?.[0]?.id || "");
  const [skillLevel, setSkillLevel] = useState("Intermediate");
  const [maxMembers, setMaxMembers] = useState(event.max_squad_size || 4);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!tierId) return;
    setIsSubmitting(true);
    try {
      const result = await createPublicOpenSquad({
        event_id: event.id,
        tier_id: tierId,
        skill_level: skillLevel,
        notes: notes || "Looking for squad mates to join!",
        max_members: maxMembers,
      });
      if (onSquadCreated) {
        onSquadCreated(result.squad);
      }
      onClose();
      router.push(result.share_url);
    } catch (err) {
      console.error("Failed to create open squad:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-500/20 p-2 text-amber-400">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Host Open Squad</h2>
              <p className="text-xs text-white/50">Recruit players for {event.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form fields */}
        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <Label className="text-white/70">Select Pass Tier *</Label>
            <Select
              value={tierId}
              onChange={(e) => setTierId(e.target.value)}
              className="bg-zinc-900 border-white/10 text-xs text-white"
            >
              {event.ticket_tiers?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — ₹{t.price}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-white/70">Required Skill Level</Label>
              <Select
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value)}
                className="bg-zinc-900 border-white/10 text-xs text-white"
              >
                <option value="All Levels">🌟 All Levels</option>
                <option value="Beginner Friendly">🌱 Beginner Friendly</option>
                <option value="Intermediate">⚡ Intermediate</option>
                <option value="Advanced / Competitive">🔥 Advanced</option>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-white/70">Target Squad Size</Label>
              <Input
                type="number"
                value={maxMembers}
                onChange={(e) => setMaxMembers(parseInt(e.target.value) || 4)}
                className="bg-zinc-900 border-white/10 h-9 text-xs text-white"
                placeholder="e.g. 4 players"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-white/70">Squad Note for Teammates</Label>
            <Textarea
              placeholder="e.g. Need 2 players for 2v2 doubles! Mavis 350 shuttles provided, split court fee..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-zinc-900 border-white/10 text-xs text-white min-h-[70px]"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="ghost" onClick={onClose} className="w-1/3 text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            variant="violet"
            onClick={handleSubmit}
            disabled={!tierId || isSubmitting}
            className="w-2/3 text-xs gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Create & List Squad
          </Button>
        </div>
      </div>
    </div>
  );
}
