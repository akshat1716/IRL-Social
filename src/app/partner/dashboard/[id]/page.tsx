import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getEventAnalytics } from "@/lib/actions/events";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Users, DollarSign, Ticket } from "lucide-react";
import { notFound } from "next/navigation";
import { PartnerDashboardRefresh } from "@/components/partner/dashboard-refresh";

export const dynamic = "force-dynamic";

export default async function PartnerDashboardPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getEventAnalytics(params.id);

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-6 pb-8">
      <PartnerDashboardRefresh eventId={params.id} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/partner" className="text-white/60 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-black text-white">
              {data.event.title}
            </h1>
            <p className="text-xs text-white/50">Live Dashboard</p>
          </div>
        </div>
        <Badge variant="lime" className="animate-pulse">
          LIVE
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-white/50">
              <Users className="h-4 w-4" />
              <span className="text-xs">Checked In</span>
            </div>
            <p className="mt-1 text-2xl font-black text-white">
              {data.checkedIn}
              <span className="text-sm font-normal text-white/40">
                /{data.totalPasses}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-white/50">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Revenue</span>
            </div>
            <p className="mt-1 text-2xl font-black text-lime-400">
              {formatCurrency(data.revenue)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Capacity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/60">
              {data.event.current_attendees} / {data.event.capacity}
            </span>
            <span className="font-bold text-violet-400">
              {data.capacityPercent}%
            </span>
          </div>
          <Progress
            value={data.capacityPercent}
            indicatorClassName="bg-violet-400"
          />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white/60">
          <Ticket className="h-4 w-4" />
          Pass Breakdown
        </h2>
        {data.tierBreakdown?.map(({ tier, sold, revenue }) => (
          <Card key={tier.name}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold text-white">{tier.name}</p>
                <p className="text-xs text-white/50">
                  {formatCurrency(tier.price)} each
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-white">{sold} sold</p>
                <p className="text-xs text-lime-400">
                  {formatCurrency(revenue)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.recentCheckIns.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white/60">
            Recent Check-ins
          </h2>
          {data.recentCheckIns.map((checkIn, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-white">
                  {checkIn.pass?.user?.name ?? "Guest"}
                </p>
                <p className="text-xs text-white/50">
                  {checkIn.pass?.tier?.name}
                </p>
              </div>
              <p className="text-xs text-white/40" suppressHydrationWarning>
                {new Date(checkIn.scanned_at).toLocaleTimeString()}
              </p>
            </div>
          ))}
        </div>
      )}

      <ReferralLink eventId={params.id} />
    </div>
  );
}

function ReferralLink({ eventId }: { eventId: string }) {
  const shareUrl = `/events/${eventId}?ref=partner`;

  return (
    <div className="rounded-xl border border-violet-400/20 bg-violet-500/5 p-4">
      <p className="text-sm font-semibold text-violet-400">Referral Link</p>
      <p className="mt-1 break-all font-mono text-xs text-white/60">
        {shareUrl}
      </p>
    </div>
  );
}
