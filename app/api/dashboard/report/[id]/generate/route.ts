import { NextResponse } from "next/server";
import { OpenRouterError } from "@/lib/rmi/openrouter";
import { generateReport } from "@/lib/rmi/report";
import { reportConfigured } from "@/lib/rmi/settings";
import {
  getAssessment,
  listStakeholderResponses,
  normaliseCode,
  setReport,
} from "@/lib/rmi/store";
import { getDashboardUser } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Write the report from whatever has come in so far. The automatic path waits
 * for every stakeholder, so when someone never answers there is no report to
 * review or send; this is how an admin gets one. It goes through the same
 * drafting and humaniser passes as every other report.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getDashboardUser();
  if (!user) {
    return NextResponse.json({ error: "You are not signed in as an admin." }, { status: 403 });
  }

  const { id } = await params;
  const assessment = await getAssessment(normaliseCode(id));
  if (!assessment) {
    return NextResponse.json({ error: "No assessment with that reference." }, { status: 404 });
  }
  if (assessment.status !== "submitted") {
    return NextResponse.json(
      { error: "The organisation has not submitted its assessment yet." },
      { status: 409 },
    );
  }
  if (assessment.report) {
    return NextResponse.json({ error: "This assessment already has a report." }, { status: 409 });
  }
  if (!(await reportConfigured(assessment.companyId))) {
    return NextResponse.json(
      { error: "Report writing is not configured. Add the OpenRouter key in Settings." },
      { status: 503 },
    );
  }

  try {
    const stakeholders = await listStakeholderResponses(assessment.id);
    const generated = await generateReport(assessment, stakeholders);
    await setReport(assessment.id, { ...generated, generatedAt: new Date().toISOString() });
    return NextResponse.json({ generated: true }, { status: 201 });
  } catch (err) {
    console.error("[rmi:report] admin generation failed", err);
    if (err instanceof OpenRouterError && err.creditsOut) {
      return NextResponse.json(
        {
          error:
            "The OpenRouter credit has run out, so the report could not be written. Add credit, or ask the administrator to if your firm is on the shared key.",
        },
        { status: 402 },
      );
    }
    return NextResponse.json(
      { error: "The report could not be written. Try again in a moment." },
      { status: 502 },
    );
  }
}
