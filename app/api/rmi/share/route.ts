import { after, NextResponse } from "next/server";
import {
  addShares,
  findShare,
  getAssessment,
  listStakeholderResponses,
  normaliseCode,
  recordDeliveries,
  saveStakeholderResponse,
  setReport,
} from "@/lib/rmi/store";
import {
  reportReadyEmail,
  send,
  shareInviteEmail,
} from "@/lib/rmi/mailer";
import { generateReport } from "@/lib/rmi/report";
import { reportConfigured } from "@/lib/rmi/settings";
import { siteUrl } from "@/lib/rmi/urls";
import { scoreAssessment, type Answers } from "@/lib/rmi/scoring";

export const runtime = "nodejs";
// after() inherits this, and the report call needs the headroom.
export const maxDuration = 120;

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

  const found = await getAssessment(normaliseCode(body.id), body.token);
  const created = await addShares(normaliseCode(body.id), body.token, people);
  if (!created) {
    return NextResponse.json({ error: "That assessment link is not valid." }, { status: 404 });
  }

  const results = await Promise.all(
    created.map(async (share) => {
      const link = `${siteUrl()}/rmi/survey?t=${share.token}`;
      const delivery = await send({
        to: share.email,
        ...shareInviteEmail({
          organisation: found?.profile.organisation ?? "an organisation you work with",
          link,
        }),
      }).catch(() => ({ ok: false, queued: false, error: "Could not reach the mail provider." }));
      return { share, email: share.email, link, delivery };
    }),
  );

  // Keep the outcome. Each invite is sent once and never retried, so this
  // record is what lets an admin see which ones did not arrive.
  const at = new Date().toISOString();
  await recordDeliveries(
    normaliseCode(body.id),
    results.map((r) => ({
      token: r.share.token,
      delivery: {
        status: r.delivery.queued ? "sent" : r.delivery.ok ? "not_sent" : "failed",
        ...("error" in r.delivery && r.delivery.error ? { error: r.delivery.error } : {}),
        at,
      },
    })),
  );

  return NextResponse.json(
    {
      invited: results.length,
      links: results.map((r) => ({ email: r.email, link: r.link, delivered: r.delivery.queued })),
    },
    { status: 201 },
  );
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

  // Writing the report takes the better part of a minute. The stakeholder has
  // no stake in that and should not sit watching a spinner for it, so it runs
  // once their response has already gone back.
  after(() => onStakeholderResponse(found.assessment.id));

  return NextResponse.json({ received: true }, { status: 201 });
}

/**
 * Called once a stakeholder answers. When the last outstanding invitation
 * comes in, the report is written and emailed without anyone pressing a
 * button. Anything that goes wrong here is logged and swallowed: the
 * stakeholder has already answered, and failing their request because our
 * report writer had a bad minute would be the wrong trade. The manual button
 * on the results page stays as the way back in.
 */
async function onStakeholderResponse(assessmentId: string): Promise<void> {
  try {
    const assessment = await getAssessment(assessmentId);
    if (!assessment) return;

    const outstanding = assessment.shares.filter((s) => !s.respondedAt).length;
    const responses = await listStakeholderResponses(assessmentId);

    if (outstanding > 0) {
      console.info("[rmi:share] still waiting", { assessmentId, outstanding });
      return;
    }

    // Everyone is in. Only write the report if there is an assessment to
    // report on and we have somewhere to send it.
    if (assessment.status !== "submitted") {
      console.info("[rmi:share] all stakeholders in, assessment not submitted yet", {
        assessmentId,
      });
      return;
    }
    if (!(await reportConfigured())) {
      console.warn("[rmi:share] all stakeholders in but no OpenRouter API key is set", {
        assessmentId,
      });
      return;
    }

    const generated = await generateReport(assessment, responses);
    await setReport(assessmentId, { ...generated, generatedAt: new Date().toISOString() });

    const link = `${siteUrl()}/rmi/report?id=${assessment.id}&t=${assessment.token}`;
    await send({
      to: assessment.profile.email,
      ...reportReadyEmail({
        organisation: assessment.profile.organisation,
        code: assessment.id,
        link,
        respondents: responses.length,
      }),
    });
    console.info("[rmi:share] report written and sent", { assessmentId });
  } catch (err) {
    console.error("[rmi:share] could not finish the report", err);
  }
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
