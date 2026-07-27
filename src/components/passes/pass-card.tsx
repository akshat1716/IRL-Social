"use client";

import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { categoryLabels } from "@/lib/store";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import type { Pass } from "@/types/database";
import { MapPin, Clock, Wine } from "lucide-react";

import Image from "next/image";

interface PassCardProps {
  pass: Pass;
  showVoucher?: boolean;
}

export function PassCard({ pass, showVoucher = false }: PassCardProps) {
  const isValid = pass.status === "valid";
  const redeemable =
    (pass.tier?.cover_redeemable_amount ?? 0) - pass.redeemed_amount;

  return (
    <Card
      className={`overflow-hidden ${!isValid ? "opacity-60" : ""}`}
    >
      <div
        className={`h-2 ${
          pass.event?.is_daytime
            ? "bg-gradient-to-r from-lime-400 to-emerald-500"
            : "bg-gradient-to-r from-violet-500 to-cyan-400"
        }`}
      />

      <CardContent className="space-y-4 p-4">
        {/* Pass Header with Official Logo */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="relative h-6 w-6 overflow-hidden rounded-md border border-white/20 bg-black">
              <Image
                src="/logo.jpg"
                alt="IRL"
                fill
                className="object-cover"
              />
            </div>
            <span className="text-[11px] font-black tracking-widest text-white/80 uppercase">
              IRL Pass
            </span>
          </div>
          <Badge
            variant={
              pass.status === "valid"
                ? "lime"
                : pass.status === "checked_in"
                  ? "cyan"
                  : "red"
            }
          >
            {pass.status === "valid"
              ? "Active"
              : pass.status === "checked_in"
                ? "Checked In"
                : "Cancelled"}
          </Badge>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-white text-lg">{pass.event?.title}</h3>
            <Badge
              variant={pass.event?.is_daytime ? "lime" : "violet"}
              className="mt-1"
            >
              {pass.event?.category
                ? categoryLabels[pass.event.category]
                : "Event"}
            </Badge>
          </div>
        </div>

        <div className="space-y-1 text-sm text-white/60">
          <div className="flex items-center gap-2" suppressHydrationWarning>
            <Clock className="h-3.5 w-3.5" />
            {pass.event?.start_time &&
              `${formatDate(pass.event.start_time)} · ${formatTime(pass.event.start_time)}`}
          </div>
          {pass.event?.venue && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              {pass.event.venue.name}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs text-white/50">Pass Type</p>
          <p className="font-semibold text-white">{pass.tier?.name}</p>
          <p className="text-sm text-white/60">
            {pass.tier?.price === 0
              ? "Free RSVP"
              : formatCurrency(pass.tier?.price ?? 0)}
          </p>
        </div>

        {isValid && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white p-4">
            <QRCodeSVG
              value={pass.qr_code_hash}
              size={160}
              bgColor="#ffffff"
              fgColor="#000000"
              level="H"
            />
            <p className="font-mono text-xs text-zinc-500">
              {pass.qr_code_hash}
            </p>
          </div>
        )}

        {showVoucher && redeemable > 0 && isValid && (
          <div className="rounded-xl border border-lime-400/30 bg-lime-400/10 p-4">
            <div className="flex items-center gap-2">
              <Wine className="h-5 w-5 text-lime-400" />
              <div>
                <p className="text-xs text-lime-400/80">Bar Voucher Balance</p>
                <p className="text-2xl font-black text-lime-400">
                  {formatCurrency(redeemable)}
                </p>
              </div>
            </div>
            <div className="mt-3 flex justify-center rounded-lg bg-white p-3">
              <QRCodeSVG
                value={`VOUCHER-${pass.qr_code_hash}`}
                size={120}
                bgColor="#ffffff"
                fgColor="#000000"
                level="H"
              />
            </div>
            <p className="mt-2 text-center text-xs text-white/40">
              Show this to bartender/café counter
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
