import { NextResponse } from "next/server";
import {
  discardTemplateDraft,
  publishTemplate,
  readTemplate,
  saveTemplateDraft,
} from "@/lib/rmi/store";
import { EDITOR_STARTER_HTML, placeholdersIn } from "@/lib/rmi/template";
import { safePath } from "@/lib/rmi/files";
import { getDashboardUser } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Generous: a letterhead with an embedded image runs to a few hundred kilobytes. */
const HTML_LIMIT = 2_000_000;

async function admin() {
  const user = await getDashboardUser();
  return user;
}

const denied = () =>
  NextResponse.json({ error: "You are not signed in as an admin." }, { status: 403 });

/** The template as it stands, plus the built-in one to fall back on. */
export async function GET() {
  if (!(await admin())) return denied();
  const template = await readTemplate();
  return NextResponse.json({
    version: template.version,
    draft: template.draft ?? null,
    published: template.published ?? null,
    builtIn: EDITOR_STARTER_HTML,
    /** Which template a report would be built from right now. */
    live: template.published ? "published" : "built-in",
  });
}

/** Save the draft. Nothing a client sees changes until it is published. */
export async function PUT(request: Request) {
  const user = await admin();
  if (!user) return denied();

  let body: { html?: unknown; doc?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request body was not JSON." }, { status: 400 });
  }

  const { html, doc } = body;
  if (typeof html !== "string" || html.trim().length === 0) {
    return NextResponse.json({ error: "The template cannot be saved empty." }, { status: 400 });
  }
  if (html.length > HTML_LIMIT) {
    return NextResponse.json(
      { error: "That template is too large. Keep images small or upload them as the logo and stamp." },
      { status: 413 },
    );
  }
  if (doc !== undefined && doc !== null && (typeof doc !== "string" || !safePath(doc))) {
    return NextResponse.json({ error: "That document path is not valid." }, { status: 400 });
  }

  const saved = await saveTemplateDraft(html, (doc as string | null) ?? null, user.email);
  return NextResponse.json({
    ok: true,
    draft: saved.draft ?? null,
    placeholders: placeholdersIn(html),
  });
}

/** Publish the draft. From here on, new reports are built from it. */
export async function POST() {
  const user = await admin();
  if (!user) return denied();

  const current = await readTemplate();
  if (!current.draft) {
    return NextResponse.json({ error: "There is no draft to publish." }, { status: 409 });
  }
  if (!placeholdersIn(current.draft.html).includes("report")) {
    return NextResponse.json(
      {
        error:
          "The draft has no {{report}} placeholder, so a report built from it would have no content. Add it and save again.",
      },
      { status: 422 },
    );
  }

  const published = await publishTemplate(user.email);
  if (!published) {
    return NextResponse.json({ error: "There is no draft to publish." }, { status: 409 });
  }
  return NextResponse.json({
    ok: true,
    version: published.version,
    published: published.published ?? null,
  });
}

/** Throw the draft away and go back to what is published. */
export async function DELETE() {
  if (!(await admin())) return denied();
  const template = await discardTemplateDraft();
  return NextResponse.json({ ok: true, version: template.version });
}
