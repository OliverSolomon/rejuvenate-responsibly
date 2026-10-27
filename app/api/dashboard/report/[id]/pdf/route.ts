import { NextResponse } from "next/server";
import { PDF_LIMIT, putFile } from "@/lib/rmi/files";
import { getAssessment, normaliseCode, setReportPdf } from "@/lib/rmi/store";
import { getDashboardUser } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Store the PDF of a report.
 *
 * The file is rendered by the editor in the admin's browser, which is the same
 * thing that drew the preview they just approved, so what is stored is exactly
 * what was on screen. The server keeps it rather than re-rendering later: a
 * client downloading in eleven months should get the document that was issued,
 * not a fresh render of wording that has since been edited.
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
  const code = normaliseCode(id);
  const assessment = await getAssessment(code);
  if (!assessment) {
    return NextResponse.json({ error: "No assessment with that reference." }, { status: 404 });
  }
  if (!assessment.report) {
    return NextResponse.json({ error: "There is no report to attach a PDF to." }, { status: 409 });
  }

  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("application/pdf")) {
    return NextResponse.json({ error: "The body has to be a PDF." }, { status: 415 });
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength === 0) {
    return NextResponse.json({ error: "The PDF was empty." }, { status: 400 });
  }
  if (bytes.byteLength > PDF_LIMIT) {
    return NextResponse.json({ error: "That PDF is too large to store." }, { status: 413 });
  }
  // Cheap sanity check that this is really a PDF and not a renamed something.
  if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) {
    return NextResponse.json({ error: "That file is not a PDF." }, { status: 415 });
  }

  const url = new URL(request.url);
  const versionParam = Number(url.searchParams.get("templateVersion"));
  const templateVersion = Number.isInteger(versionParam) && versionParam >= 0 ? versionParam : undefined;

  const filePath = `issued/${code}-${Date.now()}.pdf`;
  try {
    await putFile(filePath, bytes, "application/pdf");
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The PDF could not be stored." },
      { status: 502 },
    );
  }

  const updated = await setReportPdf(code, {
    path: filePath,
    size: bytes.byteLength,
    templateVersion,
  });
  if (!updated) {
    return NextResponse.json({ error: "The report went away while saving." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, path: filePath, size: bytes.byteLength });
}
