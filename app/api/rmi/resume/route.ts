import { NextResponse } from "next/server";
import { getAssessment, normaliseCode } from "@/lib/rmi/store";
import { assessmentAccessEmail, send } from "@/lib/rmi/mailer";
import { siteUrl } from "@/lib/rmi/urls";

export const runtime = "nodejs";

/**
 * Sends the resume link to the address already on the assessment. The reply is
 * the same whether or not the reference exists, so this cannot be used to work
 * out which references are real.
 */
export async function POST(request: Request) {
  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  if (!body.code?.trim()) {
    return NextResponse.json({ error: "Enter your reference." }, { status: 422 });
  }

  const found = await getAssessment(normaliseCode(body.code));
  if (found) {
    await send({
      to: found.profile.email,
      ...assessmentAccessEmail({
        organisation: found.profile.organisation,
        code: found.id,
        link: `${siteUrl()}/rmi/assessment?id=${found.id}&t=${found.token}`,
      }),
    }).catch(() => undefined);
  }

  return NextResponse.json({ sent: true });
}
