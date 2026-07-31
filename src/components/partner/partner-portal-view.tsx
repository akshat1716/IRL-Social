"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PayoutSettingsModal } from "@/components/partner/payout-settings-modal";
import type { Event } from "@/types/database";
import type { PayoutDetails } from "@/lib/actions/auth";
import { categoryLabels } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  BarChart3,
  Calendar,
  ChevronRight,
  Building2,
  QrCode,
} from "lucide-react";

interface PartnerPortalViewProps {
  events: Event[];
  payoutDetails: PayoutDetails;
}

export function PartnerPortalView({
  events,
  payoutDetails,
}: PartnerPortalViewProps) {
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  const hasPayoutConfigured =
    Boolean(payoutDetails.upi_id) || Boolean(payoutDetails.account_number);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="text-white/60 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white">Partner Portal</h1>
            <p className="text-sm text-white/50">Manage your venues, events & payouts</p>
          </div>
        </div>

        <button
          onClick={() => setShowPayoutModal(true)}
          className="flex items-center gap-1.5 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1.5 text-xs font-bold text-lime-400 hover:bg-lime-400/20 transition-all"
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>Payout Settings</span>
        </button>
      </div>

      {/* Payout Notification Banner if not configured */}
      {!hasPayoutConfigured && (
        <div
          onClick={() => setShowPayoutModal(true)}
          className="cursor-pointer flex items-center justify-between rounded-2xl border border-lime-400/40 bg-lime-400/10 p-4 transition-all hover:bg-lime-400/15"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400/20 text-lime-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                Add Payout Bank Account / UPI
              </p>
              <p className="text-xs text-lime-400/80">
                Tap to enter your bank details to receive ticket revenues & commissions.
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-lime-400 shrink-0" />
        </div>
      )}

      {/* Quick Action Grid */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/partner/events/new">
          <Card className="h-full transition-all hover:border-violet-400/30 hover:bg-violet-500/5">
            <CardContent className="flex flex-col items-center justify-center gap-1.5 p-4 text-center h-full">
              <Plus className="h-7 w-7 text-violet-400" />
              <p className="text-xs font-semibold text-white">Create Event</p>
              <p className="text-[10px] text-white/40">2 mins</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/scanner">
          <Card className="h-full transition-all hover:border-lime-400/30 hover:bg-lime-400/5">
            <CardContent className="flex flex-col items-center justify-center gap-1.5 p-4 text-center h-full">
              <QrCode className="h-7 w-7 text-lime-400" />
              <p className="text-xs font-semibold text-white">QR Scanner</p>
              <p className="text-[10px] text-white/40">Door check-in</p>
            </CardContent>
          </Card>
        </Link>
        <button onClick={() => setShowPayoutModal(true)} className="text-left">
          <Card className="h-full transition-all hover:border-cyan-400/30 hover:bg-cyan-500/5">
            <CardContent className="flex flex-col items-center justify-center gap-1.5 p-4 text-center h-full">
              <BarChart3 className="h-7 w-7 text-cyan-400" />
              <p className="text-xs font-semibold text-white">Payout Bank</p>
              <p className="text-[10px] text-white/40">
                {payoutDetails.upi_id ? payoutDetails.upi_id : "Set details"}
              </p>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/60">Your Hosted Events</h2>
          <Calendar className="h-4 w-4 text-white/40" />
        </div>

        {events.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-white">No active events yet</p>
            <p className="text-xs text-white/50">
              Create your first run club or social event to start hosting!
            </p>
            <Link href="/partner/events/new">
              <span className="inline-block mt-2 rounded-xl bg-violet-500 px-4 py-2 text-xs font-bold text-white hover:bg-violet-400">
                + Create First Event
              </span>
            </Link>
          </div>
        ) : (
          events.map((event) => (
            <Link key={event.id} href={`/partner/dashboard/${event.id}`}>
              <Card className="mb-2 transition-all hover:border-white/20 hover:bg-white/[0.07]">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex-1">
                    <p className="font-semibold text-white">{event.title}</p>
                    <p className="text-xs text-white/50">
                      {formatDate(event.start_time)} · {event.venue?.name}
                    </p>
                    <div className="mt-1 flex gap-2">
                      <Badge variant={event.is_daytime ? "lime" : "violet"}>
                        {categoryLabels[event.category]}
                      </Badge>
                      <Badge variant="default">
                        {event.current_attendees}/{event.capacity}
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-white/30" />
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      {/* Payout Modal */}
      <PayoutSettingsModal
        open={showPayoutModal}
        onOpenChange={setShowPayoutModal}
        initialDetails={payoutDetails}
      />
    </div>
  );
}
