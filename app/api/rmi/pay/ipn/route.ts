import { NextResponse } from "next/server";
import { findByMerchantReference, setPayment } from "@/lib/rmi/store";
import { transactionStatus } from "@/lib/rmi/pesapal";

export const runtime = "nodejs";

/**
 * Pesapal calls this when a payment settles. It only tells us which order
 * moved, so we always ask Pesapal for the real status rather than trusting the
 * shape of the callback.
 */
async function handle(orderTrackingId: string | null, merchantReference: string | null) {
  if (!orderTrackingId) {
    return NextResponse.json({ error: "Missing OrderTrackingId." }, { status: 400 });
  }

  try {
    const status = await transactionStatus(orderTrackingId);
    const reference = merchantReference ?? status.merchantReference;
    const assessment = reference ? await findByMerchantReference(reference) : undefined;

    if (assessment) {
      await setPayment(assessment.id, {
        status: status.status === "paid" ? "paid" : status.status === "failed" ? "failed" : "pending",
        method: status.paymentMethod,
        orderTrackingId,
      });
    }

    // Pesapal expects this exact acknowledgement shape.
    return NextResponse.json({
      orderNotificationType: "IPNCHANGE",
      orderTrackingId,
      orderMerchantReference: reference,
      status: 200,
    });
  } catch (err) {
    console.error("[rmi:ipn] status lookup failed", err);
    return NextResponse.json(
      { orderTrackingId, orderMerchantReference: merchantReference, status: 500 },
      { status: 200 },
    );
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  let tracking = url.searchParams.get("OrderTrackingId");
  let reference = url.searchParams.get("OrderMerchantReference");

  if (!tracking) {
    const body = await request.json().catch(() => ({}) as Record<string, string>);
    tracking = body.OrderTrackingId ?? body.orderTrackingId ?? null;
    reference = body.OrderMerchantReference ?? body.orderMerchantReference ?? reference;
  }
  return handle(tracking, reference);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return handle(
    url.searchParams.get("OrderTrackingId"),
    url.searchParams.get("OrderMerchantReference"),
  );
}
