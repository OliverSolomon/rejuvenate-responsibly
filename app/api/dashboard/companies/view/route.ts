import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COMPANY_VIEW_COOKIE, canConfigureInstallation, currentScope } from "@/lib/rmi/scope";
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
 * It is a cookie because it is how somebody is looking at the data, not a fact
 * about them: another browser, or next week, starts from the global view.
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

  const jar = await cookies();

  if (wanted === "all") {
    jar.delete(COMPANY_VIEW_COOKIE);
    return NextResponse.json({ companyId: null });
  }

  const company = await companyById(wanted);
  if (!company) {
    return NextResponse.json({ error: "There is no such company." }, { status: 404 });
  }

  jar.set(COMPANY_VIEW_COOKIE, company.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // A working session, not a setting: a month is long enough to be useful
    // and short enough that nobody is stuck in a view they have forgotten.
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ companyId: company.id, name: company.name });
}
