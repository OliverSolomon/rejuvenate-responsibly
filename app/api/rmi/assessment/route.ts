import { NextResponse } from "next/server";
import { saveSubmission } from "@/lib/rmi/store";

export const runtime = "nodejs";

type Body = Parameters<typeof saveSubmission>[0];

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  if (!body?.profile?.email || !body?.answers) {
    return NextResponse.json(
      { error: "An email address and at least one answer are required." },
      { status: 422 },
    );
  }

  const audience = body.audience === "stakeholder" ? "stakeholder" : "client";

  try {
    const saved = await saveSubmission({
      audience,
      reference: body.reference ?? null,
      profile: body.profile,
      answers: body.answers,
      score: body.score,
    });
    return NextResponse.json({ id: saved.id, createdAt: saved.createdAt }, { status: 201 });
  } catch (error) {
    console.error("[rmi] failed to save submission", error);
    return NextResponse.json({ error: "Could not save the submission." }, { status: 500 });
  }
}
