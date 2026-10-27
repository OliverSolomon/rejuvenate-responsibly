import { memberBlocked } from "@/lib/rmi/scope";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { companyRows, slugValid, slugify } from "@/lib/rmi/companies";
import { canConfigureInstallation, currentScope } from "@/lib/rmi/scope";
import { companyBySlug, createCompany } from "@/lib/rmi/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The firms using this installation.
 *
 * Only a super admin gets here, in the interface and again in this route,
 * because the existence of other companies is itself something an ordinary
 * owner should not see.
 */

const denied = () =>
  NextResponse.json({ error: "That is not something this account can see." }, { status: 403 });

export async function GET() {
  const scope = await currentScope();
  if (!scope || !canConfigureInstallation(scope)) return denied();

  try {
    return NextResponse.json({ companies: await companyRows() });
  } catch (error) {
    console.error("[rmi:companies] the list could not be read", error);
    return NextResponse.json({ error: "The companies could not be read." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const readOnly = await memberBlocked();
  if (readOnly) return readOnly;
  const scope = await currentScope();
  if (!scope || !canConfigureInstallation(scope)) return denied();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request body was not JSON." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  if (name.length < 2) {
    return NextResponse.json({ error: "A company needs a name." }, { status: 400 });
  }

  const slug = slugify(typeof body.slug === "string" && body.slug.trim() ? body.slug : name);
  if (!slugValid(slug)) {
    return NextResponse.json(
      { error: "A link name is letters, numbers and hyphens, starting and ending with one of those." },
      { status: 400 },
    );
  }
  if (await companyBySlug(slug)) {
    return NextResponse.json(
      { error: `Another company already uses the link name ${slug}.` },
      { status: 409 },
    );
  }

  try {
    const company = await createCompany({
      id: randomUUID(),
      slug,
      name,
      createdBy: scope.user.email,
    });
    if (!company) {
      return NextResponse.json({ error: "That company could not be created." }, { status: 409 });
    }
    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    console.error("[rmi:companies] the company could not be created", error);
    return NextResponse.json({ error: "That company could not be created." }, { status: 500 });
  }
}
