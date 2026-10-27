import { NextResponse } from "next/server";
import { savePrefs } from "@/lib/rmi/prefs";
import { canConfigureInstallation, currentScope } from "@/lib/rmi/scope";
import { companyById } from "@/lib/rmi/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Which company the super admin is working in.
 *
 * Two things at once, which is why it is one switch rather than two: stepping
 * into a company to use the platform the way its owner does, and stepping into
 * her own organisation so the dashboard shows that work and nothing else.
 * Sending "all" steps back out to every company.
 *
 * It is saved on their account, because it is how somebody is looking at the
 * data, not a fact about the company: signing out and back in, or opening
 * another browser, puts them where they left off.
 */
export async function PUT(request: Request) {
  const scope = await currentScope();
  if (!scope || !canConfigureInstallation(scope)) {
    return NextResponse.json(
      { error: "That is not something this account can change." },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request body was not JSON." }, { status: 400 });
  }

  const wanted = typeof body.companyId === "string" ? body.companyId.trim() : "";
  if (!wanted) {
    return NextResponse.json({ error: "Say which company, or all." }, { status: 400 });
  }

  const unsaved = () =>
    NextResponse.json(
      { error: "That could not be saved. The server needs SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 },
    );

  if (wanted === "all") {
    if (!(await savePrefs(scope.user.id, { view: "all" }))) return unsaved();
    return NextResponse.json({ companyId: null });
  }

  const company = await companyById(wanted);
  if (!company) {
    return NextResponse.json({ error: "There is no such company." }, { status: 404 });
  }

  if (!(await savePrefs(scope.user.id, { view: company.id }))) return unsaved();

  return NextResponse.json({ companyId: company.id, name: company.name });
}
