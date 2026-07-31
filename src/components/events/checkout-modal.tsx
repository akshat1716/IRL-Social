"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createPass,
  createSquadPassCheckout,
} from "@/lib/actions/tickets";
import { PaymentSelector } from "./payment-selector";
import { useCheckoutStore } from "@/lib/store";
import { cn, formatCurrency } from "@/lib/utils";
import type { Event, TicketTier } from "@/types/database";
import { Check, Copy, Link2, Minus, Plus, Users } from "lucide-react";

interface CheckoutModalProps {
  event: Event;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheckoutModal({
  event,
  open,
  onOpenChange,
}: CheckoutModalProps) {
  const queryClient = useQueryClient();
  const {
    selectedTierId,
    quantity,
    squadMode,
    setSelectedTier,
    setQuantity,
    setSquadMode,
    reset,
  } = useCheckoutStore();

  const [squadLink, setSquadLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState(false);

  const selectedTier = event.ticket_tiers?.find(
    (t) => t.id === selectedTierId
  );

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTierId) throw new Error("Select a pass");

      if (squadMode) {
        const result = await createSquadPassCheckout({
          event_id: event.id,
          tier_id: selectedTierId,
        });
        setSquadLink(`${window.location.origin}${result.share_url}`);
        return result.pass;
      }

      const passes = [];
      for (let i = 0; i < quantity; i++) {
        passes.push(
          await createPass({
            event_id: event.id,
            tier_id: selectedTierId,
          })
        );
      }
      return passes;
    },
    onSuccess: () => {
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["passes"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      if (!squadMode) {
        setTimeout(() => {
          reset();
          setSuccess(false);
          onOpenChange(false);
        }, 2000);
      }
    },
  });

  const handleClose = () => {
    reset();
    setSquadLink(null);
    setSuccess(false);
    setCopied(false);
    onOpenChange(false);
  };

  const copyLink = () => {
    if (squadLink) {
      navigator.clipboard.writeText(squadLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent onClose={handleClose} className="relative max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Get Your Pass</DialogTitle>
          <p className="text-sm text-white/50">{event.title}</p>
        </DialogHeader>

        {success && !squadMode ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-lime-400/20">
              <Check className="h-8 w-8 text-lime-400" />
            </div>
            <p className="text-lg font-bold text-white">Pass Secured!</p>
            <p className="text-sm text-white/50">
              Check My Passes for your QR code
            </p>
          </div>
        ) : success && squadMode && squadLink ? (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/20">
                <Users className="h-8 w-8 text-violet-400" />
              </div>
              <p className="text-lg font-bold text-white">Squad Created!</p>
              <p className="text-center text-sm text-white/50">
                Share this link with your friends so they can pay individually
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
              <Link2 className="h-4 w-4 shrink-0 text-white/40" />
              <span className="flex-1 truncate text-sm text-white/80">
                {squadLink}
              </span>
              <Button size="sm" variant="ghost" onClick={copyLink}>
                {copied ? (
                  <Check className="h-4 w-4 text-lime-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              {event.ticket_tiers?.map((tier) => (
                <TierOption
                  key={tier.id}
                  tier={tier}
                  selected={selectedTierId === tier.id}
                  onSelect={() => setSelectedTier(tier.id)}
                  accent={event.is_daytime ? "lime" : "violet"}
                />
              ))}
            </div>

            {selectedTier && !squadMode && selectedTier.price > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
                <span className="text-sm text-white/60">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="rounded-lg bg-white/10 p-1.5 hover:bg-white/20"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center font-bold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="rounded-lg bg-white/10 p-1.5 hover:bg-white/20"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setSquadMode(!squadMode)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-4 transition-all",
                squadMode
                  ? "border-violet-400/50 bg-violet-500/10"
                  : "border-white/10 bg-white/5 hover:bg-white/[0.07]"
              )}
            >
              <Users className="h-5 w-5 text-violet-400" />
              <div className="text-left">
                <p className="text-sm font-semibold text-white">
                  Squad Checkout
                </p>
                <p className="text-xs text-white/50">
                  Split with friends — each pays individually
                </p>
              </div>
            </button>

            {selectedTier && (
              <div className="space-y-4 border-t border-white/10 pt-4">
                {purchaseMutation.isError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-xs text-red-400">
                    <p>{purchaseMutation.error.message}</p>
                    {purchaseMutation.error.message.includes("Authentication required") && (
                      <a
                        href={`/login?redirect=/events/${event.id}`}
                        className="mt-1.5 inline-block font-bold text-lime-400 underline hover:text-lime-300"
                      >
                        Sign In Now →
                      </a>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-white/60">Total</span>
                  <span className="text-xl font-bold text-white">
                    {squadMode
                      ? formatCurrency(selectedTier.price)
                      : formatCurrency(selectedTier.price * quantity)}
                  </span>
                </div>

                {selectedTier.price > 0 ? (
                  <PaymentSelector
                    amount={
                      squadMode ? selectedTier.price : selectedTier.price * quantity
                    }
                    eventTitle={event.title}
                    isProcessing={purchaseMutation.isPending}
                    onPaymentSuccess={() => purchaseMutation.mutate()}
                  />
                ) : (
                  <Button
                    className="w-full py-6 text-base font-bold"
                    variant={event.is_daytime ? "default" : "violet"}
                    disabled={
                      !selectedTierId ||
                      purchaseMutation.isPending ||
                      selectedTier.sold_count >= selectedTier.max_quantity
                    }
                    onClick={() => purchaseMutation.mutate()}
                  >
                    {purchaseMutation.isPending
                      ? "Securing Pass..."
                      : squadMode
                        ? "Create Free Squad Pass"
                        : "RSVP Free"}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TierOption({
  tier,
  selected,
  onSelect,
  accent,
}: {
  tier: TicketTier;
  selected: boolean;
  onSelect: () => void;
  accent: "lime" | "violet";
}) {
  const soldOut = tier.sold_count >= tier.max_quantity;

  return (
    <button
      onClick={() => !soldOut && onSelect()}
      disabled={soldOut}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all",
        selected
          ? accent === "lime"
            ? "border-lime-400/50 bg-lime-400/10"
            : "border-violet-400/50 bg-violet-500/10"
          : "border-white/10 bg-white/5 hover:bg-white/[0.07]",
        soldOut && "opacity-50"
      )}
    >
      <div>
        <p className="font-semibold text-white">{tier.name}</p>
        <p className="text-xs text-white/50">{tier.description}</p>
        {tier.cover_redeemable_amount > 0 && (
          <p className="mt-1 text-xs text-lime-400">
            ₹{tier.cover_redeemable_amount} redeemable at venue
          </p>
        )}
      </div>
      <div className="text-right">
        <p className="font-bold text-white">
          {tier.price === 0 ? "Free" : formatCurrency(tier.price)}
        </p>
        {soldOut && <p className="text-xs text-red-400">Sold Out</p>}
      </div>
    </button>
  );
}
