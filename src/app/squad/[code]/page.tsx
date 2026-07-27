"use client";

import { useMutation } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSquadByCode, joinSquad } from "@/lib/actions/tickets";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Check } from "lucide-react";
import { useEffect, useState } from "react";

import Image from "next/image";

export default function SquadJoinPage() {
  const params = useParams();
  const code = params.code as string;
  const [joined, setJoined] = useState(false);
  const [squad, setSquad] = useState<Awaited<
    ReturnType<typeof getSquadByCode>
  > | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSquadByCode(code).then((data) => {
      setSquad(data);
      setLoading(false);
    });
  }, [code]);

  const joinMutation = useMutation({
    mutationFn: () => joinSquad(code),
    onSuccess: () => setJoined(true),
  });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  if (!squad) {
    return (
      <p className="py-20 text-center text-white/40">Squad not found</p>
    );
  }

  if (joined) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-lime-400/20">
          <Check className="h-8 w-8 text-lime-400" />
        </div>
        <h1 className="text-xl font-bold text-white">You&apos;re In!</h1>
        <p className="text-sm text-white/50">
          Check My Passes for your QR code
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-8">
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="relative group">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 opacity-70 blur-md" />
          <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-white/20 bg-black p-0.5 shadow-xl">
            <Image
              src="/logo.jpg"
              alt="IRL Logo"
              width={64}
              height={64}
              className="h-full w-full object-cover rounded-xl"
            />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Join the Squad</h1>
          <p className="text-sm text-white/50">
            Your friend invited you to split the bill on IRL
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="font-bold text-white">{squad.event?.title}</p>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="font-semibold text-white">{squad.tier?.name}</p>
            <p className="text-xs text-white/50">{squad.tier?.description}</p>
            <p className="mt-2 text-lg font-bold text-violet-400">
              {formatCurrency(squad.tier?.price ?? 0)}
            </p>
          </div>
          <p className="text-xs text-white/40">
            {squad.member_pass_ids.length} member(s) joined · Code:{" "}
            {squad.share_code}
          </p>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        variant="violet"
        size="lg"
        disabled={joinMutation.isPending}
        onClick={() => joinMutation.mutate()}
      >
        {joinMutation.isPending ? "Processing..." : "Pay & Join Squad"}
      </Button>
    </div>
  );
}
