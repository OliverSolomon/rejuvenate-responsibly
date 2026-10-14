import { NextResponse } from "next/server";
import { editReport, normaliseCode } from "@/lib/rmi/store";
import { getDashboardUser } from "@/utils/supabase/server";

export const runtime = "nodejs";

/** 400KB of Markdown is far more than any report, and short of anything abusive. */
const LIMIT = 400_000;

/**
 * Save an admin's edit of a report. The proxy keeps strangers off /dashboard, but
 * an API route is reachable on its own, so this checks the admin list again.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getDashboardUser();
  if (!user) {
    return NextResponse.json({ error: "You are not signed in as an admin." }, { status: 403 });
  }

  const { id } = await params;

  let markdown: unknown;
  try {
    ({ markdown } = await request.json());
  } catch {
    return NextResponse.json({ error: "The request body was not JSON." }, { status: 400 });
  }

  if (typeof markdown !== "string" || markdown.trim().length === 0) {
    return NextResponse.json({ error: "The report cannot be saved empty." }, { status: 400 });
  }
  if (markdown.length > LIMIT) {
    return NextResponse.json({ error: "That report is too long to save." }, { status: 413 });
  }

  const updated = await editReport(normaliseCode(id), markdown, user.email);
  if (!updated) {
    return NextResponse.json(
      { error: "No report exists for that assessment." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    editedAt: updated.report?.editedAt ?? null,
  });
}
