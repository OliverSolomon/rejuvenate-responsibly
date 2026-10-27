import { memberBlocked } from "@/lib/rmi/scope";
import { NextResponse } from "next/server";
import { slugValid, slugify } from "@/lib/rmi/companies";
import { canConfigureInstallation, currentScope } from "@/lib/rmi/scope";
import { saveSampleFlag, saveSharing } from "@/lib/rmi/settings";
import { SHARED_KINDS, companyById, companyBySlug, updateCompany, type SharedKind } from "@/lib/rmi/store";

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
  const readOnly = await memberBlocked();
  if (readOnly) return readOnly;
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

  // Whether the company borrows the installation's keys and template, or has to
  // bring its own. The default company is the installation, so it has nothing
  // to borrow from.
  let sharing: Partial<Record<SharedKind, boolean>> | undefined;
  if (body.sharing !== undefined) {
    if (company.isDefault) {
      return NextResponse.json(
        { error: "This is the firm that owns the installation, so there is nothing for it to share from." },
        { status: 409 },
      );
    }
    const raw = body.sharing;
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return NextResponse.json({ error: "sharing has to be an object." }, { status: 400 });
    }
    sharing = {};
    for (const [kind, value] of Object.entries(raw)) {
      if (!(SHARED_KINDS as readonly string[]).includes(kind) || typeof value !== "boolean") {
        return NextResponse.json({ error: `${kind} is not something that can be shared.` }, { status: 400 });
      }
      sharing[kind as SharedKind] = value;
    }
  }

  let sample: boolean | undefined;
  if (body.sample !== undefined) {
    if (typeof body.sample !== "boolean") {
      return NextResponse.json({ error: "sample has to be true or false." }, { status: 400 });
    }
    sample = body.sample;
  }

  if (Object.keys(patch).length === 0 && !sharing && sample === undefined) {
    return NextResponse.json({ error: "There was nothing to change." }, { status: 400 });
  }

  try {
    if (sharing) await saveSharing(id, sharing, scope.user.email);
    if (sample !== undefined) await saveSampleFlag(id, sample, scope.user.email);
    const updated =
      Object.keys(patch).length === 0 ? company : await updateCompany(id, patch);
    if (!updated) {
      return NextResponse.json({ error: "That change could not be saved." }, { status: 409 });
    }
    return NextResponse.json({ company: updated });
  } catch (error) {
    console.error("[rmi:companies] the company could not be changed", error);
    return NextResponse.json({ error: "That change could not be saved." }, { status: 500 });
  }
}
