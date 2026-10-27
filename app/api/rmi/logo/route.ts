import { NextResponse } from "next/server";
import { IMAGE_LIMIT, IMAGE_TYPES, assetHref, extensionFor, putFile, removeFile } from "@/lib/rmi/files";
import { getAssessment, normaliseCode, setClientLogo } from "@/lib/rmi/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The logo an organisation adds to its own assessment, which appears on their
 * report wherever the template places it.
 *
 * Guarded by the assessment's own reference and link, the same pair that opens
 * the assessment, so no account is needed. Optional throughout: a report
 * without one simply has no client logo on it.
 */

/** What logo, if any, is on this assessment. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const token = url.searchParams.get("t");
  if (!id || !token) {
    return NextResponse.json({ error: "Missing assessment reference or link." }, { status: 400 });
  }

  const assessment = await getAssessment(normaliseCode(id), token);
  if (!assessment) {
    return NextResponse.json({ error: "That assessment link is not valid." }, { status: 404 });
  }

  return NextResponse.json({
    path: assessment.clientLogo ?? null,
    href: assessment.clientLogo ? assetHref(assessment.clientLogo) : null,
  });
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "The upload was not a form." }, { status: 400 });
  }

  const id = form.get("id");
  const token = form.get("token");
  if (typeof id !== "string" || typeof token !== "string") {
    return NextResponse.json({ error: "Missing assessment reference or link." }, { status: 400 });
  }

  const code = normaliseCode(id);
  const assessment = await getAssessment(code, token);
  if (!assessment) {
    return NextResponse.json({ error: "That assessment link is not valid." }, { status: 404 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file came through." }, { status: 400 });
  }
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return NextResponse.json(
      { error: "A logo has to be a PNG, JPEG or WebP image." },
      { status: 415 },
    );
  }
  if (file.size > IMAGE_LIMIT) {
    const mb = Math.round(IMAGE_LIMIT / (1024 * 1024));
    return NextResponse.json({ error: `That image is over ${mb}MB.` }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const filePath = `client-logos/${code}-${Date.now()}.${extensionFor(file.type)}`;

  try {
    await putFile(filePath, bytes, file.type);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The image could not be stored." },
      { status: 502 },
    );
  }

  const previous = assessment.clientLogo;
  const updated = await setClientLogo(code, token, filePath);
  if (!updated) {
    await removeFile(filePath);
    return NextResponse.json({ error: "That assessment link is not valid." }, { status: 404 });
  }
  if (previous && previous !== filePath) await removeFile(previous);

  return NextResponse.json({ path: filePath, href: assetHref(filePath) });
}

/** Take the logo off again. */
export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const token = url.searchParams.get("t");
  if (!id || !token) {
    return NextResponse.json({ error: "Missing assessment reference or link." }, { status: 400 });
  }

  const code = normaliseCode(id);
  const assessment = await getAssessment(code, token);
  if (!assessment) {
    return NextResponse.json({ error: "That assessment link is not valid." }, { status: 404 });
  }

  const previous = assessment.clientLogo;
  const updated = await setClientLogo(code, token, null);
  if (!updated) {
    return NextResponse.json({ error: "That assessment link is not valid." }, { status: 404 });
  }
  if (previous) await removeFile(previous);

  return NextResponse.json({ ok: true });
}
