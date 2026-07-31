"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requestPartnerAccess } from "@/lib/actions/auth";
import { Sparkles, CheckCircle2, ArrowRight } from "lucide-react";

export function HostAccessGatekeeper({ userName }: { userName: string }) {
  const router = useRouter();
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    const res = await requestPartnerAccess();
    setIsUpgrading(false);
    if (res.success) {
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 py-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-400 border border-violet-500/30 shadow-lg shadow-violet-500/10 animate-bounce">
        <Sparkles className="h-8 w-8" />
      </div>

      <div className="space-y-2 max-w-sm">
        <span className="rounded-full bg-violet-500/20 px-3 py-1 text-xs font-bold text-violet-400 border border-violet-500/30">
          Partner Portal Restricted
        </span>
        <h1 className="text-2xl font-black text-white">
          Become a Verified Host
        </h1>
        <p className="text-xs text-white/60 leading-relaxed">
          Hey {userName}! The Partner Portal & event hosting dashboard is reserved for verified Event Captains, Run Club Leads, and Venue Hosts.
        </p>
      </div>

      <Card className="max-w-sm w-full border-white/10 bg-white/5 text-left">
        <CardContent className="p-4 space-y-3">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
            Host Benefits
          </p>
          <div className="space-y-2">
            <div className="flex items-start gap-2.5 text-xs text-white/80">
              <CheckCircle2 className="h-4 w-4 text-lime-400 shrink-0 mt-0.5" />
              <span>Create unlimited daytime & nightlife events under 2 mins</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-white/80">
              <CheckCircle2 className="h-4 w-4 text-lime-400 shrink-0 mt-0.5" />
              <span>Instant camera QR door scanner with offline caching</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-white/80">
              <CheckCircle2 className="h-4 w-4 text-lime-400 shrink-0 mt-0.5" />
              <span>Direct Bank & UPI payouts for ticket sales</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="w-full max-w-sm space-y-3">
        <Button
          className="w-full font-bold py-6 text-base gap-2"
          variant="violet"
          disabled={isUpgrading}
          onClick={handleUpgrade}
        >
          {isUpgrading ? (
            "Upgrading Account..."
          ) : (
            <>
              <span>Become a Host (Instant 1-Click Access)</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
        <p className="text-[11px] text-white/40">
          Free instant upgrade for community leaders & run club heads.
        </p>
      </div>
    </div>
  );
}
