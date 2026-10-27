import { memberBlocked } from "@/lib/rmi/scope";
import { NextResponse } from "next/server";
import {
  contentTypeFor,
  getFile,
  safePath,
  DOC_LIMIT,
  DOC_TYPES,
  IMAGE_LIMIT,
  IMAGE_TYPES,
  assetHref,
  extensionFor,
  putFile,
  removeFile,
} from "@/lib/rmi/files";
import { clearBrandAsset, saveBrandAsset, type BrandKind } from "@/lib/rmi/settings";
import { getDashboardUser } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Uploads from the dashboard: the firm's logo, its stamp, and a document to
 * open the report template from.
 *
 * Every stored name carries a timestamp, so replacing a logo writes a new path
 * rather than overwriting one that browsers have cached for a year. The old
 * file is deleted once the new one is recorded.
 */

const KINDS = ["logo", "stamp", "template-doc"] as const;
type Kind = (typeof KINDS)[number];

function isKind(value: unknown): value is Kind {
  return typeof value === "string" && (KINDS as readonly string[]).includes(value);
}

/** A number the browser measured, only if it looks like a real pixel size. */
function dimension(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string") return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n <= 20000 ? n : undefined;
}

/**
 * Read back a document the template was started from, so the editor can reopen
 * exactly what was saved. Restricted to the templates prefix: the public asset
 * route serves logos, and issued reports have their own guarded route.
 */
export async function GET(request: Request) {
  const user = await getDashboardUser();
  if (!user) {
    return NextResponse.json({ error: "You are not signed in as an admin." }, { status: 403 });
  }

  const filePath = new URL(request.url).searchParams.get("path") ?? "";
  if (!safePath(filePath) || !filePath.startsWith("templates/")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = await getFile(filePath);
  if (!file) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.contentType || contentTypeFor(filePath),
      "Content-Length": String(file.bytes.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  const readOnly = await memberBlocked();
  if (readOnly) return readOnly;
  const user = await getDashboardUser();
  if (!user) {
    return NextResponse.json({ error: "You are not signed in as an admin." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "The upload was not a form." }, { status: 400 });
  }

  const kind = form.get("kind");
  if (!isKind(kind)) {
    return NextResponse.json(
      { error: "Say what is being uploaded: logo, stamp or template-doc." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file came through." }, { status: 400 });
  }

  const isImage = kind === "logo" || kind === "stamp";
  const allowed: readonly string[] = isImage ? IMAGE_TYPES : DOC_TYPES;
  const limit = isImage ? IMAGE_LIMIT : DOC_LIMIT;

  if (!allowed.includes(file.type)) {
    return NextResponse.json(
      {
        error: isImage
          ? "A logo or stamp has to be a PNG, JPEG or WebP image."
          : "The template can be opened from a Word, OpenDocument, RTF, HTML, Markdown or text file. A PDF cannot be edited, so convert it first.",
      },
      { status: 415 },
    );
  }

  if (file.size > limit) {
    const mb = Math.round(limit / (1024 * 1024));
    return NextResponse.json({ error: `That file is over ${mb}MB.` }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const stamp = Date.now();
  const extension = extensionFor(file.type);
  const filePath = isImage
    ? `brand/${kind}-${stamp}.${extension}`
    : `templates/source-${stamp}.${extension}`;

  try {
    await putFile(filePath, bytes, file.type);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The file could not be stored." },
      { status: 502 },
    );
  }

  if (!isImage) {
    // The editor reads this one and the draft records its path when it saves.
    return NextResponse.json({ path: filePath, size: bytes.byteLength });
  }

  const previous = await saveBrandAsset(
    kind as BrandKind,
    {
      path: filePath,
      width: dimension(form.get("width")),
      height: dimension(form.get("height")),
      uploadedAt: new Date().toISOString(),
      uploadedBy: user.email,
    },
    user.email,
  );

  // Only once the new one is safely recorded.
  if (previous?.path && previous.path !== filePath) await removeFile(previous.path);

  return NextResponse.json({
    path: filePath,
    href: assetHref(filePath),
    size: bytes.byteLength,
  });
}

/** Remove the logo or the stamp. */
export async function DELETE(request: Request) {
  const readOnly = await memberBlocked();
  if (readOnly) return readOnly;
  const user = await getDashboardUser();
  if (!user) {
    return NextResponse.json({ error: "You are not signed in as an admin." }, { status: 403 });
  }

  const kind = new URL(request.url).searchParams.get("kind");
  if (kind !== "logo" && kind !== "stamp") {
    return NextResponse.json({ error: "Say whether to remove the logo or the stamp." }, { status: 400 });
  }

  const previous = await clearBrandAsset(kind, user.email);
  if (previous?.path) await removeFile(previous.path);

  return NextResponse.json({ ok: true });
}
