import { NextResponse } from "next/server";
import { getAssessment, normaliseCode, setPayment } from "@/lib/rmi/store";
import { pesapalConfigured, submitOrder } from "@/lib/rmi/pesapal";
import { pricing } from "@/lib/rmi/pricing";
import { siteUrl } from "@/lib/rmi/urls";

export const runtime = "nodejs";

/** Start a payment: returns the Pesapal URL to send the person to. */
export async function POST(request: Request) {
  if (!pesapalConfigured()) {
    return NextResponse.json(
      {
        error:
          "Card payment is not switched on yet. Contact us and we will invoice you directly.",
      },
      { status: 503 },
    );
  }

  let body: { id?: string; token?: string; tier?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const tier = pricing.find((t) => t.id === body.tier);
  if (!tier || tier.amount == null) {
    return NextResponse.json({ error: "Choose a tier we can charge for." }, { status: 422 });
  }

  if (!body.id || !body.token) {
    return NextResponse.json({ error: "Start an assessment first." }, { status: 400 });
  }

  const assessment = await getAssessment(normaliseCode(body.id), body.token);
  if (!assessment) {
    return NextResponse.json({ error: "That assessment link is not valid." }, { status: 404 });
  }

  const merchantReference = `${assessment.id}-${Date.now().toString(36).toUpperCase()}`;
  const base = siteUrl();

  try {
    const order = await submitOrder({
      merchantReference,
      amount: tier.amount,
      currency: tier.currency || "KES",
      description: `Rate My Impact ${tier.name} assessment`,
      callbackUrl: `${base}/rmi/payment`,
      notificationUrl: `${base}/api/rmi/pay/ipn`,
      billing: {
        email: assessment.profile.email,
        firstName: assessment.profile.contactName.split(" ")[0] ?? "",
        lastName: assessment.profile.contactName.split(" ").slice(1).join(" "),
      },
    });

    await setPayment(assessment.id, {
      status: "pending",
      tier: tier.id,
      amount: tier.amount,
      currency: tier.currency || "KES",
      merchantReference,
      orderTrackingId: order.orderTrackingId,
    });

    return NextResponse.json({ redirectUrl: order.redirectUrl }, { status: 201 });
  } catch (err) {
    console.error("[rmi:pay] could not open a Pesapal order", err);
    return NextResponse.json(
      { error: "We could not reach the payment gateway. Try again in a moment." },
      { status: 502 },
    );
  }
}
