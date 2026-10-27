import { memberBlocked } from "@/lib/rmi/scope";
import { ownedAssessment } from "@/lib/rmi/dashboard";
import { NextResponse } from "next/server";
import { send } from "@/lib/rmi/mailer";
import {
  isUndelivered,
  markSharesNotified,
  normaliseCode,
} from "@/lib/rmi/store";
import { getDashboardUser } from "@/utils/supabase/server";

export const runtime = "nodejs";

const SUBJECT_MAX = 200;
const BODY_MAX = 5_000;

/**
 * Tell the person who submitted an assessment that some of their invitations
 * did not arrive. The admin has already read and, if they wanted, edited the
 * text; this sends exactly that. The recipient is always the submitter's own
 * address on the assessment, never something the browser supplies.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const readOnly = await memberBlocked();
  if (readOnly) return readOnly;
  const user = await getDashboardUser();
  if (!user) {
    return NextResponse.json({ error: "You are not signed in as an admin." }, { status: 403 });
  }

  let body: { subject?: unknown; text?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request body was not JSON." }, { status: 400 });
  }

  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!subject || !text) {
    return NextResponse.json(
      { error: "Add a subject and a message before sending." },
      { status: 400 },
    );
  }
  if (subject.length > SUBJECT_MAX || text.length > BODY_MAX) {
    return NextResponse.json({ error: "That message is too long." }, { status: 413 });
  }
  if (/[\r\n]/.test(subject)) {
    return NextResponse.json({ error: "The subject must be a single line." }, { status: 400 });
  }

  const { id } = await params;
  const assessment = await ownedAssessment(normaliseCode(id));
  if (!assessment) {
    return NextResponse.json({ error: "No assessment with that reference." }, { status: 404 });
  }

  const failed = assessment.shares.filter(isUndelivered);
  if (failed.length === 0) {
    return NextResponse.json(
      { error: "Every invitation for this assessment has been delivered or answered." },
      { status: 409 },
    );
  }

  const delivery = await send({
    kind: "notice",
    to: assessment.profile.email,
    subject,
    text,
  });
  if (!delivery.ok) {
    return NextResponse.json(
      {
        error: `The message could not be sent: ${delivery.error ?? "the mail provider refused it"}.`,
      },
      { status: 502 },
    );
  }
  if (!delivery.queued) {
    // No mail provider is configured. Say so rather than recording a notice
    // that nobody received.
    return NextResponse.json(
      {
        error:
          "Email is not configured on the server, so nothing was sent. Add the Mailtrap token first.",
      },
      { status: 503 },
    );
  }

  await markSharesNotified(
    assessment.id,
    failed.map((s) => s.token),
    user.email,
  );
  return NextResponse.json({ sent: true, to: assessment.profile.email, addresses: failed.length });
}
