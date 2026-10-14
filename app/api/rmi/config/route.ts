import { NextResponse } from "next/server";
import { requirePayment } from "@/lib/rmi/settings";

export const runtime = "nodejs";
// Read per request: an admin can flip the switch at any time.
export const dynamic = "force-dynamic";

/** What the public pricing cards need to know. Nothing secret lives here. */
export async function GET() {
  const { value } = await requirePayment();
  return NextResponse.json({ paymentRequired: value }, { headers: { "cache-control": "no-store" } });
}
