import { NextResponse } from "next/server";
import { savePrefs } from "@/lib/rmi/prefs";
import { currentScope } from "@/lib/rmi/scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Remember something about how this person is looking at the dashboard.
 *
 * Today that is a notice they have closed, so it stays closed the next time they
 * sign in. Open to every admin, members included: it changes nothing but what
 * is on their own screen.
 */
export async function PUT(request: Request) {
  const scope = await currentScope();
  if (!scope) {
    return NextResponse.json({ error: "You are not signed in as an admin." }, { status: 403 });
  }

  let body: { dismiss?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request body was not JSON." }, { status: 400 });
  }
  if (typeof body.dismiss !== "string" || !body.dismiss.trim() || body.dismiss.length > 120) {
    return NextResponse.json({ error: "Say which notice to close." }, { status: 400 });
  }

  const kept = await savePrefs(scope.user.id, { dismiss: body.dismiss.trim() });
  return NextResponse.json({ kept });
}
