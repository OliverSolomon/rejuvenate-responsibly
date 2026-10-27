import { memberBlocked } from "@/lib/rmi/scope";
import { NextResponse } from "next/server";
import {
  discardTemplateDraft,
  publishTemplate,
  readTemplate,
  saveTemplateDraft,
} from "@/lib/rmi/store";
import { EDITOR_STARTER_HTML, placeholdersIn } from "@/lib/rmi/template";
import { safePath } from "@/lib/rmi/files";
import { isShared } from "@/lib/rmi/settings";
import { currentScope, settingsCompany } from "@/lib/rmi/scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Generous: a letterhead with an embedded image runs to a few hundred kilobytes. */
const HTML_LIMIT = 2_000_000;

/**
 * Who is asking and which company's template they are working on. Null when
 * they are not on the team.
 */
async function admin() {
  const scope = await currentScope();
  if (!scope) return null;
  return { ...scope.user, company: settingsCompany(scope) };
}

const sharedNotice = () =>
  NextResponse.json(
    {
      error:
        "This company uses the shared report template, which the administrator manages. Ask them to switch sharing off if you need one of your own.",
    },
    { status: 409 },
  );

const denied = () =>
  NextResponse.json({ error: "You are not signed in as an admin." }, { status: 403 });

/** The template as it stands, plus the built-in one to fall back on. */
export async function GET() {
  const user = await admin();
  if (!user) return denied();
  const template = await readTemplate(user.company);
  return NextResponse.json({
    shared: await isShared(user.company, "template"),
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
  const readOnly = await memberBlocked();
  if (readOnly) return readOnly;
  const user = await admin();
  if (!user) return denied();
  if (await isShared(user.company, "template")) return sharedNotice();

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

  const saved = await saveTemplateDraft(
    html,
    (doc as string | null) ?? null,
    user.email,
    user.company,
  );
  return NextResponse.json({
    ok: true,
    draft: saved.draft ?? null,
    placeholders: placeholdersIn(html),
  });
}

/** Publish the draft. From here on, new reports are built from it. */
export async function POST() {
  const readOnly = await memberBlocked();
  if (readOnly) return readOnly;
  const user = await admin();
  if (!user) return denied();
  if (await isShared(user.company, "template")) return sharedNotice();

  const current = await readTemplate(user.company);
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

  const published = await publishTemplate(user.email, user.company);
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
  const readOnly = await memberBlocked();
  if (readOnly) return readOnly;
  const user = await admin();
  if (!user) return denied();
  if (await isShared(user.company, "template")) return sharedNotice();
  const template = await discardTemplateDraft(user.company);
  return NextResponse.json({ ok: true, version: template.version });
}
