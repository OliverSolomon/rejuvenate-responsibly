import { NextResponse } from "next/server";
import { getAssessment, normaliseCode, setPayment } from "@/lib/rmi/store";
import { transactionStatus } from "@/lib/rmi/pesapal";

export const runtime = "nodejs";

/**
 * The page the person lands on after paying polls this. The IPN is the source
 * of truth, but it can arrive after the redirect, so we also ask directly.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const token = url.searchParams.get("t");
  const tracking = url.searchParams.get("OrderTrackingId");

  if (!id || !token) {
    return NextResponse.json({ error: "Missing assessment ID or link." }, { status: 400 });
  }

  const assessment = await getAssessment(normaliseCode(id), token);
  if (!assessment) {
    return NextResponse.json({ error: "That assessment link is not valid." }, { status: 404 });
  }

  const orderTrackingId = tracking ?? assessment.payment.orderTrackingId;
  if (assessment.payment.status === "paid" || !orderTrackingId) {
    return NextResponse.json({ status: assessment.payment.status });
  }

  try {
    const live = await transactionStatus(orderTrackingId);
    const next = live.status === "paid" ? "paid" : live.status === "failed" ? "failed" : "pending";
    await setPayment(assessment.id, { status: next, method: live.paymentMethod, orderTrackingId });
    return NextResponse.json({ status: next, method: live.paymentMethod });
  } catch {
    return NextResponse.json({ status: assessment.payment.status });
  }
}
