"use client";

import { PassCard } from "@/components/passes/pass-card";
import type { Pass } from "@/types/database";
import { Ticket } from "lucide-react";
import { useState } from "react";

interface PassesListProps {
  passes: Pass[];
}

export function PassesList({ passes }: PassesListProps) {
  const [showVoucher, setShowVoucher] = useState<string | null>(null);

  const activePasses = passes.filter((p) => p.status !== "cancelled");
  const pastPasses = passes.filter((p) => p.status === "checked_in");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">My Passes</h1>
        <p className="text-sm text-white/50">Your digital passbook</p>
      </div>

      {activePasses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Ticket className="h-12 w-12 text-white/20" />
          <p className="text-white/40">No passes yet</p>
          <p className="text-sm text-white/30">
            Discover events and grab your first pass
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activePasses.map((pass) => (
            <div key={pass.id}>
              <PassCard pass={pass} showVoucher={showVoucher === pass.id} />
              {(pass.tier?.cover_redeemable_amount ?? 0) > 0 &&
                pass.status === "valid" && (
                  <button
                    onClick={() =>
                      setShowVoucher(
                        showVoucher === pass.id ? null : pass.id
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-lime-400/20 py-2 text-sm font-semibold text-lime-400 hover:bg-lime-400/10"
                  >
                    {showVoucher === pass.id
                      ? "Hide Bar Voucher"
                      : "Show Bar Voucher"}
                  </button>
                )}
            </div>
          ))}
        </div>
      )}

      {pastPasses.length > 0 && (
        <div className="space-y-3 pt-4">
          <h2 className="text-sm font-semibold text-white/40">Past Events</h2>
          {pastPasses.map((pass) => (
            <PassCard key={pass.id} pass={pass} />
          ))}
        </div>
      )}
    </div>
  );
}
