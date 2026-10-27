import { NextResponse } from "next/server";
import { slugValid, slugify } from "@/lib/rmi/companies";
import { canConfigureInstallation, currentScope } from "@/lib/rmi/scope";
import { companyById, companyBySlug, updateCompany } from "@/lib/rmi/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Rename a company, change its link name, or close and reopen it.
 *
 * Closing is as far as this goes. A company's assessments and reports are its
 * clients' work, so nothing here deletes any of it: a closed company stops
 * taking new assessments and keeps everything it has.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const scope = await currentScope();
  if (!scope || !canConfigureInstallation(scope)) {
    return NextResponse.json(
      { error: "That is not something this account can change." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const company = await companyById(id);
  if (!company) {
    return NextResponse.json({ error: "There is no such company." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request body was not JSON." }, { status: 400 });
  }

  const patch: { name?: string; slug?: string; active?: boolean } = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    if (name.length < 2) {
      return NextResponse.json({ error: "A company needs a name." }, { status: 400 });
    }
    patch.name = name;
  }

  if (body.slug !== undefined) {
    const slug = slugify(typeof body.slug === "string" ? body.slug : "");
    if (!slugValid(slug)) {
      return NextResponse.json(
        { error: "A link name is letters, numbers and hyphens." },
        { status: 400 },
      );
    }
    const clash = await companyBySlug(slug);
    if (clash && clash.id !== id) {
      return NextResponse.json(
        { error: `Another company already uses the link name ${slug}.` },
        { status: 409 },
      );
    }
    patch.slug = slug;
  }

  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") {
      return NextResponse.json({ error: "active has to be true or false." }, { status: 400 });
    }
    if (!body.active && company.isDefault) {
      return NextResponse.json(
        { error: "This is the firm that owns the installation, so it cannot be closed." },
        { status: 409 },
      );
    }
    patch.active = body.active;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "There was nothing to change." }, { status: 400 });
  }

  try {
    const updated = await updateCompany(id, patch);
    if (!updated) {
      return NextResponse.json({ error: "That change could not be saved." }, { status: 409 });
    }
    return NextResponse.json({ company: updated });
  } catch (error) {
    console.error("[rmi:companies] the company could not be changed", error);
    return NextResponse.json({ error: "That change could not be saved." }, { status: 500 });
  }
}
