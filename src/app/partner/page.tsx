import { redirect } from "next/navigation";
import { getCurrentUser, getPayoutDetails } from "@/lib/actions/auth";
import { getEvents } from "@/lib/actions/events";
import { HostAccessGatekeeper } from "@/components/partner/host-access-gatekeeper";
import { PartnerPortalView } from "@/components/partner/partner-portal-view";

export const dynamic = "force-dynamic";

export default async function PartnerPortalPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?redirect=/partner");
  }

  // Check if role is partner or door_staff
  const isAuthorized =
    currentUser.role === "partner" || currentUser.role === "door_staff";

  if (!isAuthorized) {
    return <HostAccessGatekeeper userName={currentUser.name} />;
  }

  const [events, payoutDetails] = await Promise.all([
    getEvents(),
    getPayoutDetails(),
  ]);

  return (
    <PartnerPortalView events={events} payoutDetails={payoutDetails} />
  );
}
