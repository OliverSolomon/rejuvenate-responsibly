import { NextResponse } from "next/server";
import { contentTypeFor, getFile, isPublicAsset, safePath } from "@/lib/rmi/files";

export const runtime = "nodejs";

/**
 * Serves a logo or a stamp.
 *
 * The bucket itself is private, so this is the only way to see these files, and
 * it will only serve the two prefixes that hold them. An issued report is not
 * one of them: those go through their own route, behind the assessment's token.
 *
 * Nothing here is secret. A logo is printed on documents the client receives,
 * so it is served to anyone with the path and cached hard. The paths carry a
 * version suffix, so a replaced logo gets a new path rather than a stale cache.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const filePath = segments.join("/");

  if (!safePath(filePath) || !isPublicAsset(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = await getFile(filePath);
  if (!file) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.contentType || contentTypeFor(filePath),
      "Content-Length": String(file.bytes.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      // These are images, but say so plainly rather than trusting the type.
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
