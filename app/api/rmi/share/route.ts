import { NextResponse } from "next/server";
import { addShares, findShare, normaliseCode, saveStakeholderResponse } from "@/lib/rmi/store";
import { send, shareInviteEmail } from "@/lib/rmi/mailer";
import { siteUrl } from "@/lib/rmi/urls";
import { scoreAssessment, type Answers } from "@/lib/rmi/scoring";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** The filler shares the assessment with the other parties. */
export async function POST(request: Request) {
  let body: {
    id?: string;
    token?: string;
    people?: { name?: string; email?: string; relationship?: string }[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  if (!body.id || !body.token) {
    return NextResponse.json({ error: "Missing assessment ID or link." }, { status: 400 });
  }

  const people = (body.people ?? [])
    .filter((p) => p?.email && EMAIL.test(p.email.trim()))
    .map((p) => ({
      name: p.name?.trim() ?? "",
      email: p.email!.trim(),
      relationship: p.relationship?.trim() ?? "",
    }));

  if (people.length === 0) {
    return NextResponse.json(
      { error: "Add at least one valid email address." },
      { status: 422 },
    );
  }
  if (people.length > 5) {
    return NextResponse.json(
      { error: "The assessment takes a maximum of five stakeholders." },
      { status: 422 },
    );
  }

  const created = await addShares(normaliseCode(body.id), body.token, people);
  if (!created) {
    return NextResponse.json({ error: "That assessment link is not valid." }, { status: 404 });
  }

  const results = await Promise.all(
    created.map(async (share) => {
      const link = `${siteUrl()}/rmi/survey?t=${share.token}`;
      const delivery = await send({
        to: share.email,
        ...shareInviteEmail({ link }),
      }).catch(() => ({ ok: false, queued: false }));
      return { email: share.email, link, delivered: delivery.queued };
    }),
  );

  return NextResponse.json({ invited: results.length, links: results }, { status: 201 });
}

/** A stakeholder returns their survey. */
export async function PUT(request: Request) {
  let body: { token?: string; answers?: Answers; name?: string; relationship?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  if (!body.token || !body.answers) {
    return NextResponse.json({ error: "Missing survey link or answers." }, { status: 400 });
  }

  const found = await findShare(body.token);
  if (!found) {
    return NextResponse.json({ error: "That survey link is not valid." }, { status: 404 });
  }

  const scored = scoreAssessment(body.answers, "stakeholder");
  await saveStakeholderResponse({
    assessmentId: found.assessment.id,
    shareToken: body.token,
    name: body.name?.trim() || found.share.name,
    email: found.share.email,
    relationship: body.relationship?.trim() || found.share.relationship,
    answers: body.answers,
    score: {
      overall: scored.overall,
      coverage: scored.coverage,
      depth: scored.depth,
      tier: scored.tier.name,
      sections: scored.sections.map((s) => ({ id: s.id, score: s.score })),
    },
  });

  return NextResponse.json({ received: true }, { status: 201 });
}

/** A stakeholder opens their link: tell the page who they are rating. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("t");
  if (!token) return NextResponse.json({ error: "Missing survey link." }, { status: 400 });

  const found = await findShare(token);
  if (!found) {
    return NextResponse.json({ error: "That survey link is not valid." }, { status: 404 });
  }

  return NextResponse.json({
    organisation: found.assessment.profile.organisation,
    invitedBy: found.assessment.profile.contactName,
    name: found.share.name,
    relationship: found.share.relationship,
    alreadyResponded: Boolean(found.share.respondedAt),
  });
}
