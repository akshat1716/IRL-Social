"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requestPartnerAccess, getPartnerApplicationStatus } from "@/lib/actions/auth";
import { Sparkles, CheckCircle2, ArrowRight, Clock, Loader2 } from "lucide-react";

export function HostAccessGatekeeper({ userName }: { userName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getPartnerApplicationStatus().then((res) => {
      setStatus(res.status);
      setLoading(false);
    });
  }, []);

  const handleApply = async () => {
    setIsApplying(true);
    const res = await requestPartnerAccess(message);
    setIsApplying(false);
    if (res.success) {
      setStatus("pending");
      router.refresh();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 py-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/10 animate-pulse">
          <Clock className="h-8 w-8" />
        </div>

        <div className="space-y-2 max-w-sm">
          <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-400 border border-amber-500/30">
            Pending Approval
          </span>
          <h1 className="text-2xl font-black text-white">
            Application Under Review
          </h1>
          <p className="text-xs text-white/60 leading-relaxed">
            Hey {userName}! Your host application has been submitted to the IRL Admin Team. Your account will be upgraded to Host Status upon approval.
          </p>
        </div>

        <Card className="max-w-sm w-full border-white/10 bg-white/5 text-left">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Status Details
            </p>
            <p className="text-xs text-white/80">
              • Application Status: <span className="font-bold text-amber-400">PENDING ADMIN REVIEW</span>
            </p>
            <p className="text-xs text-white/50">
              Administrators review applications daily. Once approved, refresh this page to access your partner dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          Apply for Host Access
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
        <input
          type="text"
          placeholder="Optional: Introduce your event or venue..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-violet-400"
        />
        <Button
          className="w-full font-bold py-6 text-base gap-2"
          variant="violet"
          disabled={isApplying}
          onClick={handleApply}
        >
          {isApplying ? (
            "Submitting Application..."
          ) : (
            <>
              <span>Submit Partner Application</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
        <p className="text-[11px] text-white/40">
          Applications are reviewed by IRL administrators before host access is granted.
        </p>
      </div>
    </div>
  );
}
