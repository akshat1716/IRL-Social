"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  cachePassesForEvent,
  getCachedPass,
  markCachedPassScanned,
  addPendingSyncScan,
  getPendingSyncScans,
  clearPendingSyncScan,
} from "@/lib/offline-cache";
import {
  validatePass,
  getEventPassesForCache,
  getEventsForScanner,
} from "@/lib/actions/scanner";
import Link from "next/link";
import {
  ArrowLeft,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ScanStatus = "idle" | "granted" | "already_scanned" | "invalid";

interface ScanState {
  status: ScanStatus;
  message: string;
  passName?: string;
  tierName?: string;
}

interface ScannerEvent {
  id: string;
  title: string;
}

function mapValidateStatus(
  status: "VALID" | "ALREADY_SCANNED" | "INVALID"
): ScanStatus {
  switch (status) {
    case "VALID":
      return "granted";
    case "ALREADY_SCANNED":
      return "already_scanned";
    default:
      return "invalid";
  }
}

export default function ScannerPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [scanResult, setScanResult] = useState<ScanState>({
    status: "idle",
    message: "",
  });
  const [events, setEvents] = useState<ScannerEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [cacheStatus, setCacheStatus] = useState<string>("");
  const lastScanRef = useRef<string>("");

  useEffect(() => {
    getEventsForScanner().then((data) => {
      setEvents(data);
      if (data.length > 0) setSelectedEvent(data[0].id);
    });
  }, []);

  const syncPendingScans = useCallback(async () => {
    const pending = await getPendingSyncScans();
    for (const qrHash of pending) {
      try {
        const result = await validatePass(qrHash);
        if (result.status === "VALID" || result.status === "ALREADY_SCANNED") {
          await clearPendingSyncScan(qrHash);
        }
      } catch {
        // Will retry on next online event
      }
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingScans();
    };
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncPendingScans]);

  const cacheEventPasses = async () => {
    if (!selectedEvent) return;
    try {
      const cacheData = await getEventPassesForCache(selectedEvent);
      await cachePassesForEvent(selectedEvent, cacheData);
      setCacheStatus(`Cached ${cacheData.length} passes for offline use`);
    } catch {
      setCacheStatus("Failed to cache passes");
    }
  };

  const validateOffline = async (qrHash: string) => {
    const cached = await getCachedPass(qrHash);

    if (!cached) {
      setScanResult({
        status: "invalid",
        message: "INVALID PASS (Offline — not in cache)",
      });
      return;
    }

    if (cached.status === "checked_in") {
      setScanResult({
        status: "already_scanned",
        message: "ALREADY SCANNED (Offline)",
        passName: cached.user_name,
        tierName: cached.tier_name,
      });
      return;
    }

    await markCachedPassScanned(qrHash);
    await addPendingSyncScan(qrHash);

    setScanResult({
      status: "granted",
      message: "ACCESS GRANTED (Offline — will sync)",
      passName: cached.user_name,
      tierName: cached.tier_name,
    });
  };

  const validateScan = useCallback(
    async (qrHash: string) => {
      if (qrHash === lastScanRef.current) return;
      lastScanRef.current = qrHash;

      if (isOnline) {
        try {
          const result = await validatePass(qrHash);

          setScanResult({
            status: mapValidateStatus(result.status),
            message: result.message,
            passName: result.pass?.user?.name,
            tierName: result.pass?.tier?.name,
          });
        } catch {
          await validateOffline(qrHash);
        }
      } else {
        await validateOffline(qrHash);
      }

      setTimeout(() => {
        lastScanRef.current = "";
        setScanResult({ status: "idle", message: "" });
      }, 3000);
    },
    [isOnline]
  );

  const startScanner = async () => {
    if (scannerRef.current) return;

    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => validateScan(decodedText),
        () => {}
      );
      setScanning(true);
    } catch {
      setScanResult({
        status: "invalid",
        message: "Camera access denied",
      });
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop();
      scannerRef.current = null;
      setScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const statusConfig = {
    idle: { bg: "", icon: null, text: "" },
    granted: {
      bg: "bg-lime-400/20 border-lime-400/50",
      icon: CheckCircle2,
      text: "text-lime-400",
    },
    already_scanned: {
      bg: "bg-yellow-400/20 border-yellow-400/50",
      icon: AlertTriangle,
      text: "text-yellow-400",
    },
    invalid: {
      bg: "bg-red-500/20 border-red-500/50",
      icon: XCircle,
      text: "text-red-400",
    },
  };

  const config = statusConfig[scanResult.status];
  const StatusIcon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <Link
          href="/profile"
          className="flex items-center gap-1 text-sm text-white/60"
        >
          <ArrowLeft className="h-4 w-4" />
          Exit
        </Link>
        <h1 className="text-sm font-bold text-white">Door Scanner</h1>
        <Badge variant={isOnline ? "lime" : "red"} className="gap-1">
          {isOnline ? (
            <Wifi className="h-3 w-3" />
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
          {isOnline ? "Online" : "Offline"}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center space-y-4 p-4">
        <div
          id="qr-reader"
          className={cn(
            "w-full max-w-sm overflow-hidden rounded-2xl",
            !scanning && "hidden"
          )}
        />

        {!scanning && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-white/20">
              <RefreshCw className="h-10 w-10 text-white/30" />
            </div>
            <p className="text-center text-white/50">
              Tap below to start scanning QR passes
            </p>
          </div>
        )}

        {scanResult.status !== "idle" && StatusIcon && (
          <div
            className={cn(
              "w-full max-w-sm animate-in rounded-2xl border p-6 text-center",
              config.bg
            )}
          >
            <StatusIcon
              className={cn("mx-auto mb-3 h-12 w-12", config.text)}
            />
            <p className={cn("text-xl font-black", config.text)}>
              {scanResult.message}
            </p>
            {scanResult.passName && (
              <p className="mt-2 text-sm text-white/60">
                {scanResult.passName} · {scanResult.tierName}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-white/10 p-4">
        <div className="flex gap-2">
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            disabled={events.length === 0}
          >
            {events.length === 0 ? (
              <option value="">No active events</option>
            ) : (
              events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))
            )}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={cacheEventPasses}
            disabled={!selectedEvent}
          >
            Cache
          </Button>
        </div>
        {cacheStatus && (
          <p className="text-center text-xs text-white/40">{cacheStatus}</p>
        )}
        <Button
          className="w-full"
          variant={scanning ? "destructive" : "default"}
          onClick={scanning ? stopScanner : startScanner}
        >
          {scanning ? "Stop Scanner" : "Start Scanner"}
        </Button>
      </div>
    </div>
  );
}
