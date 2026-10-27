import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { storageBackend } from "./storage-config";

/**
 * Uploaded files: logos, stamps, the template document, issued PDFs.
 *
 * This is deliberately separate from the data store. It follows the same shape
 * though: Supabase Storage when Supabase is the backend, a directory on disk
 * otherwise, so local development works with nothing configured.
 *
 * Nothing here is reachable by URL. The bucket is private and the application
 * serves bytes through its own routes, which is what lets an expired report be
 * stamped on the way out and keeps an issued report behind its token.
 */

const BUCKET = "rmi-assets";

/** Where the local backend keeps files. Mirrors RMI_DATA_DIR for the JSON store. */
const LOCAL_DIR = path.join(
  process.env.RMI_DATA_DIR?.trim() || path.join(process.cwd(), ".data"),
  "files",
);

export type StoredFile = { bytes: Uint8Array; contentType: string };

/* -------------------------------------------------------------------------- */
/* what may be uploaded                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Images for a logo or stamp. SVG is left out on purpose: it is a document
 * that can carry script, and these are served inline to browsers. A PNG about
 * a thousand pixels wide prints as cleanly as anyone needs.
 */
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const IMAGE_LIMIT = 3 * 1024 * 1024;

/**
 * Documents the report template can be opened from. These are the formats the
 * editor itself can read. PDF is not among them, which the upload panel says.
 */
export const DOC_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.oasis.opendocument.text",
  "application/rtf",
  "text/rtf",
  "text/html",
  "text/markdown",
  "text/plain",
] as const;
export const DOC_LIMIT = 10 * 1024 * 1024;

export const PDF_LIMIT = 25 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
  "application/vnd.oasis.opendocument.text": "odt",
  "application/rtf": "rtf",
  "text/rtf": "rtf",
  "text/html": "html",
  "text/markdown": "md",
  "text/plain": "txt",
};

export function extensionFor(contentType: string): string {
  return EXTENSIONS[contentType] ?? "bin";
}

const BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  odt: "application/vnd.oasis.opendocument.text",
  rtf: "application/rtf",
  html: "text/html",
  md: "text/markdown",
  txt: "text/plain",
  json: "application/json",
};

export function contentTypeFor(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return BY_EXTENSION[ext] ?? "application/octet-stream";
}

/**
 * A path is ours to serve only if it is one of these. Keeps a bug elsewhere
 * from turning the asset route into a way to read anything in the bucket.
 */
export const PUBLIC_PREFIXES = ["brand/", "client-logos/"] as const;

export function isPublicAsset(filePath: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => filePath.startsWith(prefix));
}

/** Rejects anything that is not a plain relative path inside the bucket. */
export function safePath(filePath: string): boolean {
  return (
    filePath.length > 0 &&
    filePath.length <= 200 &&
    /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(filePath) &&
    !filePath.includes("..") &&
    !filePath.includes("//")
  );
}

/* -------------------------------------------------------------------------- */
/* the two backends                                                            */
/* -------------------------------------------------------------------------- */

let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("File storage needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

function localPath(filePath: string): string {
  return path.join(LOCAL_DIR, filePath);
}

export async function putFile(
  filePath: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  if (!safePath(filePath)) throw new Error("That file path is not allowed.");

  if (storageBackend() === "supabase") {
    const { error } = await db()
      .storage.from(BUCKET)
      .upload(filePath, bytes, { contentType, upsert: true });
    if (error) throw new Error(`The file could not be stored: ${error.message}`);
    return;
  }

  const target = localPath(filePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
}

export async function getFile(filePath: string): Promise<StoredFile | null> {
  if (!safePath(filePath)) return null;

  if (storageBackend() === "supabase") {
    const { data, error } = await db().storage.from(BUCKET).download(filePath);
    if (error || !data) return null;
    return {
      bytes: new Uint8Array(await data.arrayBuffer()),
      contentType: data.type || contentTypeFor(filePath),
    };
  }

  try {
    const bytes = await readFile(localPath(filePath));
    return { bytes: new Uint8Array(bytes), contentType: contentTypeFor(filePath) };
  } catch {
    return null;
  }
}

export async function removeFile(filePath: string): Promise<void> {
  if (!safePath(filePath)) return;

  if (storageBackend() === "supabase") {
    await db().storage.from(BUCKET).remove([filePath]);
    return;
  }

  try {
    await unlink(localPath(filePath));
  } catch {
    // Already gone, which is the state we wanted.
  }
}

/** The path a browser fetches a public asset from. */
export function assetHref(filePath: string): string {
  return `/api/assets/${filePath}`;
}
