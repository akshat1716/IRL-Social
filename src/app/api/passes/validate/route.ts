import { NextRequest, NextResponse } from "next/server";
import { validatePass } from "@/lib/actions/scanner";

export async function POST(request: NextRequest) {
  try {
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
