"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  updatePayoutDetails,
  type PayoutDetails,
} from "@/lib/actions/auth";
import { Building2, Check, Sparkles, Lock } from "lucide-react";

interface PayoutSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDetails: PayoutDetails;
}

export function PayoutSettingsModal({
  open,
  onOpenChange,
  initialDetails,
}: PayoutSettingsModalProps) {
  const [form, setForm] = useState<PayoutDetails>(initialDetails);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    const res = await updatePayoutDetails(form);
    setIsSaving(false);
    if (res.success) {
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onOpenChange(false);
      }, 1200);
    } else {
      setError(res.error || "Failed to save payout details");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-lime-400" />
            <DialogTitle>Host Payout & Bank Settings</DialogTitle>
          </div>
          <p className="text-xs text-white/50">
            Where your ticket sales revenue & commissions will be deposited.
          </p>
        </DialogHeader>

        {saved ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lime-400/20 text-lime-400">
              <Check className="h-6 w-6" />
            </div>
            <p className="font-bold text-white text-base">
              Payout Details Saved!
            </p>
            <p className="text-xs text-white/50">
              Your payouts will be automatically transferred here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                {error}
              </div>
            )}

            {/* UPI Payout VPA */}
            <div className="space-y-1.5 rounded-xl border border-lime-400/30 bg-lime-400/5 p-3.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-lime-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Instant UPI Payout VPA
                </Label>
                <span className="text-[10px] text-white/40">Recommended</span>
              </div>
              <Input
                placeholder="e.g. metaclubz@okicici or 9876543210@paytm"
                value={form.upi_id}
                onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
                className="font-mono text-sm border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
              <p className="text-[10px] text-white/40">
                1-tap direct payout to your Google Pay / PhonePe / Paytm UPI.
              </p>
            </div>

            <div className="relative flex items-center justify-center my-2">
              <span className="bg-zinc-950 px-2 text-[10px] uppercase tracking-wider text-white/40">
                or Direct Bank Account
              </span>
              <div className="absolute inset-0 -z-10 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
            </div>

            {/* Bank Details */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Account Holder Name</Label>
                <Input
                  placeholder="Official registered name on bank account"
                  value={form.account_name}
                  onChange={(e) =>
                    setForm({ ...form, account_name: e.target.value })
                  }
                  className="mt-1 text-sm border-white/10 bg-white/5 text-white placeholder:text-white/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-xs">Bank Name</Label>
                  <Input
                    placeholder="HDFC / ICICI / SBI"
                    value={form.bank_name}
                    onChange={(e) =>
                      setForm({ ...form, bank_name: e.target.value })
                    }
                    className="mt-1 text-sm border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  />
                </div>
                <div>
                  <Label className="text-xs">IFSC Code</Label>
                  <Input
                    placeholder="HDFC0001234"
                    value={form.ifsc_code}
                    onChange={(e) =>
                      setForm({ ...form, ifsc_code: e.target.value.toUpperCase() })
                    }
                    className="mt-1 font-mono text-sm border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Account Number</Label>
                <Input
                  type="password"
                  placeholder="•••• •••• •••• 5678"
                  value={form.account_number}
                  onChange={(e) =>
                    setForm({ ...form, account_number: e.target.value })
                  }
                  className="mt-1 font-mono text-sm border-white/10 bg-white/5 text-white placeholder:text-white/30"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-white/40">
              <Lock className="h-3 w-3 text-lime-400" />
              <span>Payout credentials are end-to-end encrypted & PCI compliant.</span>
            </div>

            <Button
              className="w-full mt-2 font-bold"
              variant="default"
              disabled={isSaving}
              onClick={handleSave}
            >
              {isSaving ? "Saving..." : "Save Payout Details"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
