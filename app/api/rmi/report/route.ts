import { NextResponse } from "next/server";
import {
  getAssessment,
  listStakeholderResponses,
  normaliseCode,
  setReport,
} from "@/lib/rmi/store";
import { generateReport, reportConfigured } from "@/lib/rmi/report";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const token = url.searchParams.get("t");
  if (!id || !token) {
    return NextResponse.json({ error: "Missing assessment ID or link." }, { status: 400 });
  }

  const assessment = await getAssessment(normaliseCode(id), token);
  if (!assessment) {
    return NextResponse.json({ error: "That assessment link is not valid." }, { status: 404 });
  }
  if (!assessment.report) {
    return NextResponse.json({ error: "No report has been generated yet." }, { status: 404 });
  }
  return NextResponse.json(assessment.report);
}

export async function POST(request: Request) {
  if (!reportConfigured()) {
    return NextResponse.json(
      { error: "Report generation is not switched on yet. Set OPENROUTER_API_KEY." },
      { status: 503 },
    );
  }

  let body: { id?: string; token?: string; force?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }
  if (!body.id || !body.token) {
    return NextResponse.json({ error: "Missing assessment ID or link." }, { status: 400 });
  }

  const assessment = await getAssessment(normaliseCode(body.id), body.token);
  if (!assessment) {
    return NextResponse.json({ error: "That assessment link is not valid." }, { status: 404 });
  }
  if (assessment.status !== "submitted") {
    return NextResponse.json(
      { error: "Finish and submit the assessment before generating a report." },
      { status: 409 },
    );
  }
  if (assessment.report && !body.force) {
    return NextResponse.json(assessment.report);
  }

  try {
    const stakeholders = await listStakeholderResponses(assessment.id);
    const generated = await generateReport(assessment, stakeholders);
    const report = { ...generated, generatedAt: new Date().toISOString() };
    await setReport(assessment.id, report);
    return NextResponse.json(report, { status: 201 });
  } catch (err) {
    console.error("[rmi:report] generation failed", err);
    return NextResponse.json(
      { error: "The report could not be generated. Try again in a moment." },
      { status: 502 },
    );
  }
}
