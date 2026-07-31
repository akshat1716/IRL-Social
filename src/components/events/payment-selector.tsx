"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";
import {
  CreditCard,
  Smartphone,
  Lock,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export interface PaymentSelectorProps {
  amount: number;
  eventTitle: string;
  onPaymentSuccess: (method: string) => void;
  isProcessing: boolean;
}

type PaymentType = "upi" | "apple_pay" | "card";

// 1. Paytm Icon (High Resolution SVG)
function PaytmIcon({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none">
      <rect width="120" height="120" rx="26" fill="#00BAF2" />
      <path
        d="M0 60h120v34c0 14.36-11.64 26-26 26H26C11.64 120 0 108.36 0 94V60z"
        fill="#002E6D"
      />
      <circle cx="60" cy="60" r="40" fill="#FFFFFF" />
      <text
        x="24"
        y="68"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="24"
        fill="#002E6D"
      >
        pay
      </text>
      <text
        x="64"
        y="68"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="24"
        fill="#00BAF2"
      >
        tm
      </text>
    </svg>
  );
}

// 2. PhonePe Icon (High Resolution SVG)
function PhonePeIcon({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none">
      <rect width="120" height="120" rx="26" fill="#5F259F" />
      <path
        d="M38 28h44v12H62v15c11 1 19 9.5 19 20.5 0 11.5-9.5 21-21 21H50V68h11c6 0 11-5 11-11s-5-11-11-11H50V28H38z"
        fill="#FFFFFF"
      />
      <path
        d="M72 26L52 52"
        stroke="#FFFFFF"
        strokeWidth="10"
        strokeLinecap="round"
      />
    </svg>
  );
}

// 3. Google Pay Icon (High Resolution SVG)
function GPayIcon({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none">
      <rect
        width="120"
        height="120"
        rx="26"
        fill="#FFFFFF"
        stroke="#E2E8F0"
        strokeWidth="3"
      />
      <g transform="translate(20, 24) scale(0.8)">
        <path
          d="M52.4 41.6L35.2 24.4c-5.6-5.6-14.8-5.6-20.4 0L5.8 33.4c-5.6 5.6-5.6 14.8 0 20.4l35.3 35.3c5.6 5.6 14.8 5.6 20.4 0l9-9c5.6-5.6 5.6-14.8 0-20.4L52.4 41.6z"
          fill="#4285F4"
        />
        <path
          d="M81.8 33.4l-9-9c-5.6-5.6-14.8-5.6-20.4 0L17.2 59.6c-5.6 5.6-5.6 14.8 0 20.4l9 9c5.6 5.6 14.8 5.6 20.4 0l35.2-35.2c5.7-5.7 5.7-14.8 0-20.4z"
          fill="#34A853"
        />
        <path
          d="M52.4 41.6L43.4 32.6c-5.6-5.6-14.8-5.6-20.4 0L14 41.6c-5.6 5.6-5.6 14.8 0 20.4l9 9 29.4-29.4z"
          fill="#FBBC05"
        />
        <path
          d="M81.8 33.4c-5.6-5.6-14.8-5.6-20.4 0L32 62.8l9 9 31.8-31.8c5.7-5.7 5.7-14.9 9-6.6z"
          fill="#EA4335"
        />
      </g>
    </svg>
  );
}

// 4. BHIM Icon (High Resolution SVG)
function BhimIcon({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none">
      <rect
        width="120"
        height="120"
        rx="26"
        fill="#FFFFFF"
        stroke="#E2E8F0"
        strokeWidth="3"
      />
      <path d="M30 94L82 26H56L30 94z" fill="#FF7A00" />
      <path d="M52 94L94 40H72L52 94z" fill="#008837" />
    </svg>
  );
}

// 5. Amazon Pay Icon (High Resolution SVG)
function AmazonPayIcon({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="58" fill="#000000" />
      <text
        x="14"
        y="62"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="21"
        fill="#FFFFFF"
      >
        amazon
      </text>
      <text
        x="80"
        y="62"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="400"
        fontSize="21"
        fill="#FFFFFF"
      >
        pay
      </text>
      <path
        d="M22 71c14 8 29 8 42 0"
        stroke="#FFFFFF"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M60 67l7 4.5-4 6"
        stroke="#FFFFFF"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 6. CRED Pay Icon (High Resolution SVG)
function CredPayIcon({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none">
      <rect
        width="120"
        height="120"
        rx="26"
        fill="#121212"
        stroke="#333333"
        strokeWidth="3"
      />
      <path
        d="M32 30h56v60H32V30z"
        stroke="#FFFFFF"
        strokeWidth="7"
        fill="none"
      />
      <path
        d="M44 42h32v36H44V42z"
        stroke="#FFFFFF"
        strokeWidth="6"
        fill="none"
      />
      <path d="M56 54h8v12h-8V54z" fill="#FFFFFF" />
    </svg>
  );
}

// Apple Logo Icon
function AppleLogoIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 170 170" fill="currentColor">
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.82.13-9.75-1.94-14.78-6.23-3.32-2.87-7.2-7.59-11.64-14.15-6.27-9.33-11.16-19.74-14.67-31.25-3.51-11.51-5.26-22.38-5.26-32.61 0-15.03 3.65-27.42 10.96-37.16 7.3-9.74 16.5-14.68 27.59-14.82 5.09 0 10.73 1.25 16.92 3.75 6.18 2.5 10.15 3.75 11.91 3.75 1.45 0 5.48-1.29 12.09-3.87 6.6-2.58 12.09-3.8 16.46-3.67 9.87.5 18.34 4.1 25.42 10.8 7.07 6.7 11.52 14.93 13.34 24.69-8.91 5.37-13.27 12.82-13.08 22.34.19 8.1 3.21 15.02 9.06 20.76 5.85 5.74 12.82 9.04 20.91 9.9-2.45 7.15-5.63 13.97-9.54 20.46zM119.22 31.63c0-7.3 2.61-14.28 7.83-20.93 5.22-6.66 11.83-10.7 19.83-12.13.25 1.01.38 1.95.38 2.82 0 7.42-2.65 14.51-7.96 21.26-5.3 6.75-11.92 10.8-19.86 12.15-.13-.88-.22-2.07-.22-3.17z" />
    </svg>
  );
}

interface UpiAppConfig {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  textColor: string;
}

// 6 Apps Total: Paytm, PhonePe, Google Pay, BHIM, Amazon Pay, CRED Pay (Balanced 2x3 / 3x2 Grid)
const UPI_APPS: UpiAppConfig[] = [
  {
    id: "paytm",
    name: "Paytm",
    icon: PaytmIcon,
    textColor: "text-sky-400 font-bold",
  },
  {
    id: "phonepe",
    name: "PhonePe",
    icon: PhonePeIcon,
    textColor: "text-purple-400 font-bold",
  },
  {
    id: "gpay",
    name: "Google Pay",
    icon: GPayIcon,
    textColor: "text-blue-400 font-bold",
  },
  {
    id: "bhim",
    name: "BHIM",
    icon: BhimIcon,
    textColor: "text-amber-400 font-bold",
  },
  {
    id: "amazonpay",
    name: "Amazon Pay",
    icon: AmazonPayIcon,
    textColor: "text-orange-400 font-bold",
  },
  {
    id: "cred",
    name: "CRED Pay",
    icon: CredPayIcon,
    textColor: "text-zinc-200 font-bold",
  },
];

export function PaymentSelector({
  amount,
  eventTitle,
  onPaymentSuccess,
  isProcessing,
}: PaymentSelectorProps) {
  const [selectedType, setSelectedType] = useState<PaymentType>("upi");
  const [selectedUpiApp, setSelectedUpiApp] = useState<string>("paytm");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Card State
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");

  const upiId = "irlsocial@okicici";
  const upiPayUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
    "IRL Social"
  )}&am=${amount}&tn=${encodeURIComponent(
    `Pass for ${eventTitle}`
  )}&cu=INR`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const formatCardNumberInput = (val: string) => {
    const v = val.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(" ") : val;
  };

  const formatExpiryInput = (val: string) => {
    const v = val.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    return v;
  };

  const handlePay = (type: PaymentType, methodLabel: string) => {
    setIsSimulating(true);

    if (type === "upi" && typeof window !== "undefined") {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = upiPayUrl;
      }
    }

    setTimeout(() => {
      setIsSimulating(false);
      onPaymentSuccess(methodLabel);
    }, 1500);
  };

  const selectedAppObj =
    UPI_APPS.find((a) => a.id === selectedUpiApp) || UPI_APPS[0];
  const SelectedAppIcon = selectedAppObj.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <span className="text-xs font-semibold tracking-wider text-white/50 uppercase">
          Select Payment Method
        </span>
        <span className="flex items-center gap-1 text-xs text-lime-400 font-mono">
          <Lock className="h-3 w-3" /> 256-Bit Encrypted
        </span>
      </div>

      {/* 1. Instant UPI Container */}
      <div
        className={cn(
          "rounded-2xl border transition-all overflow-hidden",
          selectedType === "upi"
            ? "border-lime-400/60 bg-lime-400/[0.03] shadow-lg shadow-lime-400/5"
            : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
        )}
      >
        <button
          type="button"
          onClick={() => setSelectedType("upi")}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-400/20 text-lime-400">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-white text-sm">Instant UPI</p>
                <span className="rounded-full bg-lime-400/20 px-2 py-0.5 text-[10px] font-bold text-lime-400">
                  1-Tap Deep-Link
                </span>
              </div>
              <p className="text-xs text-white/50">
                Paytm, PhonePe, GPay, BHIM, Amazon Pay & CRED
              </p>
            </div>
          </div>
          {selectedType === "upi" ? (
            <ChevronUp className="h-4 w-4 text-lime-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-white/40" />
          )}
        </button>

        {selectedType === "upi" && (
          <div className="border-t border-white/10 p-4 space-y-4 animate-in fade-in duration-200">
            {/* Perfectly Symmetrical 6-App Grid (2x3 or 3x2) */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {UPI_APPS.map((app) => {
                const IconComponent = app.icon;
                const isSelected = selectedUpiApp === app.id;
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setSelectedUpiApp(app.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border p-3 transition-all text-left",
                      isSelected
                        ? "border-lime-400 bg-lime-400/20 shadow-md shadow-lime-400/10 scale-[1.02]"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    )}
                  >
                    <IconComponent className="h-10 w-10 shrink-0 rounded-xl shadow-md" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold leading-tight truncate text-white">
                        {app.name}
                      </span>
                      <span className="text-[10px] text-white/50">Instant UPI</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* UPI Deep Link / QR Section */}
            <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="bg-white p-2 rounded-xl shadow-inner shrink-0">
                <QRCodeSVG
                  value={upiPayUrl}
                  size={100}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="M"
                />
              </div>
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs text-white/60">UPI VPA:</span>
                  <code className="rounded bg-black/40 px-2 py-0.5 font-mono text-xs text-lime-400 border border-white/10">
                    {upiId}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="text-white/60 hover:text-white"
                  >
                    {copiedUpi ? (
                      <Check className="h-3.5 w-3.5 text-lime-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-white/50 flex items-center justify-center sm:justify-start gap-1.5">
                  <SelectedAppIcon className="h-5 w-5 shrink-0 rounded" />
                  Tap below to open{" "}
                  <strong className="text-white">{selectedAppObj.name}</strong> or
                  scan QR.
                </p>
                <Button
                  className="w-full sm:w-auto font-bold gap-2"
                  variant="default"
                  size="sm"
                  disabled={isProcessing || isSimulating}
                  onClick={() =>
                    handlePay("upi", `UPI (${selectedAppObj.name})`)
                  }
                >
                  <SelectedAppIcon className="h-5 w-5 shrink-0 rounded" />
                  {isSimulating || isProcessing
                    ? "Opening App & Verifying..."
                    : `Pay ${formatCurrency(amount)} via ${selectedAppObj.name}`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Official Apple Pay Button */}
      <div className="pt-1">
        <button
          type="button"
          disabled={isProcessing || isSimulating}
          onClick={() => handlePay("apple_pay", "Apple Pay")}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-black py-3.5 px-6 text-white border border-white/20 shadow-lg transition-all hover:bg-zinc-900 hover:border-white/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
        >
          {isSimulating || isProcessing ? (
            <span className="text-sm font-medium text-white/80">Authorizing Apple Pay...</span>
          ) : (
            <div className="flex items-center justify-center gap-1.5">
              <AppleLogoIcon className="h-6 w-6 fill-white text-white" />
              <span className="text-2xl font-bold tracking-tight text-white font-sans leading-none">
                Pay
              </span>
            </div>
          )}
        </button>
      </div>

      {/* 3. Debit / Credit Card Accordion */}
      <div
        className={cn(
          "rounded-2xl border transition-all overflow-hidden",
          selectedType === "card"
            ? "border-violet-400/60 bg-violet-500/[0.03] shadow-lg shadow-violet-500/5"
            : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
        )}
      >
        <button
          type="button"
          onClick={() => setSelectedType("card")}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Debit / Credit Card</p>
              <p className="text-xs text-white/50">
                Visa, Mastercard, RuPay, Maestro & Diners
              </p>
            </div>
          </div>
          {selectedType === "card" ? (
            <ChevronUp className="h-4 w-4 text-violet-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-white/40" />
          )}
        </button>

        {selectedType === "card" && (
          <div className="border-t border-white/10 p-4 space-y-3 animate-in fade-in duration-200">
            <div>
              <label className="text-[11px] font-semibold text-white/60">
                Card Number
              </label>
              <Input
                type="text"
                placeholder="4532 •••• •••• 8921"
                maxLength={19}
                value={cardNumber}
                onChange={(e) =>
                  setCardNumber(formatCardNumberInput(e.target.value))
                }
                className="mt-1 font-mono text-sm border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-white/60">
                  Expiry (MM/YY)
                </label>
                <Input
                  type="text"
                  placeholder="08/28"
                  maxLength={5}
                  value={cardExpiry}
                  onChange={(e) =>
                    setCardExpiry(formatExpiryInput(e.target.value))
                  }
                  className="mt-1 font-mono text-sm border-white/10 bg-white/5 text-white placeholder:text-white/30"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-white/60">
                  CVV / CVC
                </label>
                <Input
                  type="password"
                  placeholder="•••"
                  maxLength={4}
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value)}
                  className="mt-1 font-mono text-sm border-white/10 bg-white/5 text-white placeholder:text-white/30"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-white/60">
                Cardholder Name
              </label>
              <Input
                type="text"
                placeholder="Full name on card"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="mt-1 text-sm border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
            </div>
            <Button
              className="w-full mt-2"
              variant="violet"
              disabled={isProcessing || isSimulating}
              onClick={() => handlePay("card", "Debit/Credit Card")}
            >
              {isSimulating || isProcessing ? (
                "Processing Card Payment..."
              ) : (
                <>Pay {formatCurrency(amount)} with Card</>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
