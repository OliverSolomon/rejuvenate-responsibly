import { NextResponse } from "next/server";
import { savePrefs } from "@/lib/rmi/prefs";
import { currentScope } from "@/lib/rmi/scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Switch between the live platform and the demo.
 *
 * Open to every admin, because it only changes how they are looking: it moves
 * nothing and deletes nothing. The choice is saved on their account, so the
 * next sign-in starts where they left off.
 */
export async function PUT(request: Request) {
  const scope = await currentScope();
  if (!scope) {
    return NextResponse.json({ error: "You are not signed in as an admin." }, { status: 403 });
  }

  let body: { mode?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request body was not JSON." }, { status: 400 });
  }
  if (body.mode !== "live" && body.mode !== "demo") {
    return NextResponse.json({ error: "mode has to be live or demo." }, { status: 400 });
  }

  if (!(await savePrefs(scope.user.id, { mode: body.mode }))) {
    return NextResponse.json(
      { error: "That could not be saved. The server needs SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 },
    );
  }
  return NextResponse.json({ mode: body.mode });
}
