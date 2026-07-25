"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function PartnerDashboardRefresh({ eventId }: { eventId: string }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(interval);
  }, [router, eventId]);

  return null;
}
