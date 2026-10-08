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

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
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
      if (!selectedTierId || !selectedTier) throw new Error("Select a pass");

      // Path 1: Free Tier Claim (/api/payments/claim-free)
      if (selectedTier.price === 0) {
        const claimRes = await fetch("/api/payments/claim-free", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_id: event.id,
            tier_id: selectedTierId,
            squad_mode: squadMode,
          }),
        });

        const claimData = await claimRes.json();
        if (!claimRes.ok || !claimData.success) {
          throw new Error(claimData.error || "Failed to claim free pass");
        }

        if (claimData.share_url) {
          setSquadLink(`${window.location.origin}${claimData.share_url}`);
        }
        return claimData.pass || claimData.passes;
      }

      // Path 2: Paid Tier Order Creation (/api/payments/create-order)
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          tier_id: selectedTierId,
          quantity,
          squad_mode: squadMode,
        }),
      });

      const orderData = await orderRes.json();

      if (orderRes.status !== 200 || orderData.error) {
        throw new Error(orderData.error || "Failed to create payment order");
      }

      // Simulation mode decision made strictly by server
      if (orderData.is_simulated) {
        const verifyRes = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: orderData.id,
            razorpay_payment_id: "pay_sim_" + Date.now(),
            razorpay_signature: "sig_sim",
          }),
        });

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok || !verifyData.success) {
          throw new Error(verifyData.error || "Verification failed");
        }

        if (verifyData.share_url) {
          setSquadLink(`${window.location.origin}${verifyData.share_url}`);
        }
        return verifyData.pass || verifyData.passes;
      }

      // Live Razorpay Gateway Flow
      return new Promise((resolve, reject) => {
        const loadScript = (src: string) => {
          return new Promise((res) => {
            if (document.querySelector(`script[src="${src}"]`)) return res(true);
            const script = document.createElement("script");
            script.src = src;
            script.onload = () => res(true);
            script.onerror = () => res(false);
            document.body.appendChild(script);
          });
        };

        loadScript("https://checkout.razorpay.com/v1/checkout.js").then((loaded) => {
          const win = window as unknown as { Razorpay: new (opts: unknown) => { open: () => void } };
          if (!loaded || !win.Razorpay) {
            return reject(new Error("Failed to load Razorpay Payment Gateway"));
          }

          const options = {
            key: orderData.key,
            amount: orderData.amount,
            currency: orderData.currency,
            name: "IRL Events",
            description: `${event.title} — ${selectedTier.name}`,
            order_id: orderData.id,
            theme: { color: "#a855f7" },
            handler: async (response: RazorpayResponse) => {
              try {
                const verifyRes = await fetch("/api/payments/verify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  }),
                });

                const verifyData = await verifyRes.json();
                if (verifyRes.ok && verifyData.success) {
                  if (verifyData.share_url) {
                    setSquadLink(`${window.location.origin}${verifyData.share_url}`);
                  }
                  resolve(verifyData.pass || verifyData.passes);
                } else {
                  reject(new Error(verifyData.error || "Payment signature mismatch"));
                }
              } catch (err) {
                reject(err);
              }
            },
            modal: {
              ondismiss: () => {
                reject(new Error("Payment cancelled by user"));
              },
            },
          };

          const rzp = new win.Razorpay(options);
          rzp.open();
        });
      });
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
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-xs text-red-400 space-y-2">
                    <p className="font-bold">
                      {purchaseMutation.error.message.includes("Server Components") ||
                      purchaseMutation.error.message.includes("sign in") ||
                      purchaseMutation.error.message.includes("Authentication")
                        ? "Please sign in to complete your pass booking."
                        : purchaseMutation.error.message}
                    </p>
                    <a
                      href={`/login?redirect=/events/${event.id}`}
                      className="inline-block rounded-lg bg-lime-400 px-3 py-1.5 font-bold text-black hover:bg-lime-300 transition-all"
                    >
                      Sign In to Continue →
                    </a>
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
