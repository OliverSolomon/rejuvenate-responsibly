import { NextResponse } from "next/server";
import { reportReadyEmail, send } from "@/lib/rmi/mailer";
import { getAssessment, markReportSent, normaliseCode } from "@/lib/rmi/store";
import { siteUrl } from "@/lib/rmi/urls";
import { getDashboardUser } from "@/utils/supabase/server";

export const runtime = "nodejs";

/**
 * Send the final report to the person who submitted the assessment, whether or
 * not every stakeholder has answered.
 *
 * The count of who is outstanding is worked out here from the stored data, not
 * taken from the browser, and a send with anyone outstanding is refused unless
 * the admin has explicitly acknowledged it. The modal asks for that, and this is
 * the check that holds if something calls the route directly.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getDashboardUser();
  if (!user) {
    return NextResponse.json({ error: "You are not signed in as an admin." }, { status: 403 });
  }

  let acknowledged = false;
  try {
    const body = await request.json();
    acknowledged = body?.acknowledged === true;
  } catch {
    // An empty body is fine: it just means nothing was acknowledged.
  }

  const { id } = await params;
  const assessment = await getAssessment(normaliseCode(id));
  if (!assessment) {
    return NextResponse.json({ error: "No assessment with that reference." }, { status: 404 });
  }
  if (!assessment.report) {
    return NextResponse.json({ error: "There is no report to send yet." }, { status: 409 });
  }

  const invited = assessment.shares.length;
  const outstanding = assessment.shares.filter((s) => !s.respondedAt).length;
  const responded = invited - outstanding;

  if (outstanding > 0 && !acknowledged) {
    return NextResponse.json(
      {
        error: `${outstanding} ${outstanding === 1 ? "stakeholder has" : "stakeholders have"} not answered. Confirm that you want to send the report without their answers.`,
        outstanding,
      },
      { status: 409 },
    );
  }

  const delivery = await send({
    to: assessment.profile.email,
    ...reportReadyEmail({
      organisation: assessment.profile.organisation,
      code: assessment.id,
      link: `${siteUrl()}/rmi/report?id=${assessment.id}&t=${assessment.token}`,
      respondents: responded,
      invited,
      outstanding,
    }),
  });

  if (!delivery.ok) {
    return NextResponse.json(
      {
        error: `The report could not be sent: ${delivery.error ?? "the mail provider refused it"}.`,
      },
      { status: 502 },
    );
  }
  if (!delivery.queued) {
    // No mail provider configured. Do not record a send nobody received.
    return NextResponse.json(
      {
        error:
          "Email is not configured on the server, so nothing was sent. Add the Mailtrap token first.",
      },
      { status: 503 },
    );
  }

  await markReportSent(assessment.id, user.email, outstanding);
  return NextResponse.json({
    sent: true,
    to: assessment.profile.email,
    outstanding,
  });
}
