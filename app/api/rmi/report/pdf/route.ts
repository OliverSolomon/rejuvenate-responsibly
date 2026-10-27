import { NextResponse } from "next/server";
import { getFile } from "@/lib/rmi/files";
import { stampExpired } from "@/lib/rmi/pdf-stamp";
import {
  getAssessment,
  normaliseCode,
  reportExpired,
  reportExpiry,
} from "@/lib/rmi/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The client's copy of their report, behind the same reference and link that
 * opens the report page.
 *
 * It serves the document that was issued rather than a fresh render, so a
 * download in eleven months is the same paper the client was sent. Once the
 * year is up it still downloads, stamped as expired on the way out.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const token = url.searchParams.get("t");
  if (!id || !token) {
    return NextResponse.json({ error: "Missing assessment reference or link." }, { status: 400 });
  }

  const assessment = await getAssessment(normaliseCode(id), token);
  if (!assessment) {
    return NextResponse.json({ error: "That report link is not valid." }, { status: 404 });
  }

  const report = assessment.report;
  const pdfPath = report?.pdfPath;
  if (!report || !pdfPath) {
    return NextResponse.json(
      {
        error:
          "No PDF has been issued for this report yet. Use the print button on the report page to make one.",
      },
      { status: 404 },
    );
  }

  const stored = await getFile(pdfPath);
  if (!stored) {
    return NextResponse.json(
      { error: "The issued document could not be found. Please get in touch and we will resend it." },
      { status: 410 },
    );
  }

  const expires = reportExpiry(report);
  const expired = reportExpired(report);
  const bytes = expired && expires ? await stampExpired(stored.bytes, expires) : stored.bytes;

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `attachment; filename="${assessment.id}-impact-report.pdf"`,
      // Never cached: whether it carries the expiry stamp depends on the date.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
