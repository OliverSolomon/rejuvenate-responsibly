import { memberBlocked } from "@/lib/rmi/scope";
import { NextResponse } from "next/server";
import { companyRows } from "@/lib/rmi/companies";
import { currentScope, type Scope } from "@/lib/rmi/scope";
import { buildSamples } from "@/lib/rmi/samples";
import { countSamples, removeSamples, replaceSamples } from "@/lib/rmi/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard() {
  const scope = await currentScope();
  return scope
    ? { scope, denied: null }
    : {
        scope: null,
        denied: NextResponse.json({ error: "You are not signed in as an admin." }, { status: 403 }),
      };
}

/**
 * Whose samples this request is about.
 *
 * Someone looking at one company gets that company's. A super admin looking at
 * every company gets each company that is marked as a sample, so a demo of the
 * whole installation fills every firm in it at once.
 */
async function targets(scope: Scope): Promise<string[]> {
  if (scope.companyId) return [scope.companyId];
  const rows = await companyRows();
  const marked = rows.filter((c) => c.sample).map((c) => c.id);
  return marked.length ? marked : [scope.homeCompanyId];
}

/** Load the sample set, replacing any earlier one. Real records are never touched. */
export async function POST() {
  const readOnly = await memberBlocked();
  if (readOnly) return readOnly;
  const { scope, denied } = await guard();
  if (denied || !scope) return denied;

  const companyIds = await targets(scope);
  const { assessments, responses } = buildSamples(new Date(), companyIds);
  await replaceSamples(assessments, responses, companyIds);
  return NextResponse.json({ loaded: await countSamples(companyIds) }, { status: 201 });
}

/** Remove the sample records in view and nothing else. */
export async function DELETE() {
  const readOnly = await memberBlocked();
  if (readOnly) return readOnly;
  const { scope, denied } = await guard();
  if (denied || !scope) return denied;

  return NextResponse.json({ removed: await removeSamples(await targets(scope)) });
}
