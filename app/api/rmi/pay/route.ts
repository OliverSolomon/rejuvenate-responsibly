import { NextResponse } from "next/server";
import { getAssessment, normaliseCode, setPayment } from "@/lib/rmi/store";
import { submitOrder } from "@/lib/rmi/pesapal";
import { pricing } from "@/lib/rmi/pricing";
import { pesapalConfigured, requirePayment } from "@/lib/rmi/settings";
import { siteUrl } from "@/lib/rmi/urls";

export const runtime = "nodejs";

/**
 * Start a payment: returns the URL to send the person to. That is the Pesapal
 * checkout, or, while an admin has "require payment" switched off for testing,
 * straight into the assessment with the payment marked as waived.
 */
export async function POST(request: Request) {
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

  const base = siteUrl();

  if (!(await requirePayment()).value) {
    // Waived, not paid: test runs must never look like revenue in the dashboard.
    await setPayment(assessment.id, {
      status: "waived",
      tier: tier.id,
      amount: null,
      currency: tier.currency || "KES",
    });
    return NextResponse.json(
      {
        skipped: true,
        redirectUrl: `${base}/rmi/assessment?id=${assessment.id}&t=${assessment.token}`,
      },
      { status: 201 },
    );
  }

  if (!(await pesapalConfigured(assessment.companyId))) {
    return NextResponse.json(
      {
        error:
          "Card payment is not switched on yet. Contact us and we will invoice you directly.",
      },
      { status: 503 },
    );
  }

  const merchantReference = `${assessment.id}-${Date.now().toString(36).toUpperCase()}`;

  try {
    const order = await submitOrder({
      companyId: assessment.companyId,
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
