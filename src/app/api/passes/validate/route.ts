import { NextRequest, NextResponse } from "next/server";
import { validatePass } from "@/lib/actions/scanner";

// Simple in-memory sliding window rate limiter (max 60 validation requests per minute per IP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many pass validation requests. Rate limit exceeded." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { qr_code_hash } = body;

    if (!qr_code_hash) {
      return NextResponse.json(
        { error: "QR code hash required" },
        { status: 400 }
      );
    }

    const result = await validatePass(qr_code_hash);

    return NextResponse.json({
      status: result.status,
      pass: result.pass,
      scanned_at: result.scanned_at,
      message: result.message,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Validation failed" },
      { status: 500 }
    );
  }
}
