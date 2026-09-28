import { NextResponse } from "next/server";
import {
  clearAnswers,
  createAssessment,
  getAssessment,
  normaliseCode,
  updateAssessment,
  type Profile,
} from "@/lib/rmi/store";
import { assessmentAccessEmail, send } from "@/lib/rmi/mailer";
import { siteUrl } from "@/lib/rmi/urls";
import type { Answers } from "@/lib/rmi/scoring";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function publicView(a: NonNullable<Awaited<ReturnType<typeof getAssessment>>>) {
  return {
    id: a.id,
    token: a.token,
    status: a.status,
    profile: a.profile,
    answers: a.answers,
    score: a.score,
    payment: { status: a.payment.status, tier: a.payment.tier },
    shares: a.shares.map((s) => ({
      name: s.name,
      email: s.email,
      relationship: s.relationship,
      respondedAt: s.respondedAt,
    })),
    hasReport: Boolean(a.report),
    resumeUrl: `${siteUrl()}/rmi/assessment?id=${a.id}&t=${a.token}`,
  };
}

/** Resume: GET /api/rmi/assessment?id=RMI-XXXX&t=token */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const token = url.searchParams.get("t");
  if (!id) return NextResponse.json({ error: "Give us an assessment ID." }, { status: 400 });

  const found = await getAssessment(normaliseCode(id), token ?? undefined);
  if (!found) {
    return NextResponse.json(
      { error: "We could not find an assessment with that ID and link." },
      { status: 404 },
    );
  }
  return NextResponse.json(publicView(found));
}

/** Start a new assessment, and email the person their ID. */
export async function POST(request: Request) {
  let body: { profile?: Profile };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const profile = body.profile;
  if (!profile?.email || !EMAIL.test(profile.email) || !profile.organisation?.trim()) {
    return NextResponse.json(
      { error: "An organisation and a valid email address are required." },
      { status: 422 },
    );
  }

  const created = await createAssessment({
    organisation: profile.organisation.trim(),
    contactName: profile.contactName?.trim() ?? "",
    email: profile.email.trim().toLowerCase(),
    role: profile.role?.trim() ?? "",
    sector: profile.sector?.trim() ?? "",
  });

  const resumeUrl = `${siteUrl()}/rmi/assessment?id=${created.id}&t=${created.token}`;
  const delivery = await send({
    to: created.profile.email,
    ...assessmentAccessEmail({
      organisation: created.profile.organisation,
      code: created.id,
      link: resumeUrl,
    }),
  }).catch(() => ({ ok: false, queued: false }));

  return NextResponse.json({ ...publicView(created), emailed: delivery.queued }, { status: 201 });
}

/** Autosave, and finalise on submit. */
export async function PATCH(request: Request) {
  let body: {
    id?: string;
    token?: string;
    profile?: Profile;
    answers?: Answers;
    score?: NonNullable<Awaited<ReturnType<typeof getAssessment>>>["score"];
    submit?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  if (!body.id || !body.token) {
    return NextResponse.json({ error: "Missing assessment ID or link." }, { status: 400 });
  }

  const updated = await updateAssessment(normaliseCode(body.id), body.token, {
    ...(body.profile ? { profile: body.profile } : {}),
    ...(body.answers ? { answers: body.answers } : {}),
    ...(body.score ? { score: body.score } : {}),
    ...(body.submit
      ? { status: "submitted" as const, submittedAt: new Date().toISOString() }
      : {}),
  });

  if (!updated) {
    return NextResponse.json({ error: "That assessment link is not valid." }, { status: 404 });
  }
  return NextResponse.json(publicView(updated));
}

/** Clear every answer on an assessment, keeping the ID alive. */
export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const token = url.searchParams.get("t");
  if (!id || !token) {
    return NextResponse.json({ error: "Missing assessment ID or link." }, { status: 400 });
  }

  const done = await clearAnswers(normaliseCode(id), token);
  if (!done) {
    return NextResponse.json({ error: "That assessment link is not valid." }, { status: 404 });
  }
  return NextResponse.json({ cleared: true });
}
