import { NextResponse } from "next/server";
import { buildSamples } from "@/lib/rmi/samples";
import { countSamples, removeSamples, replaceSamples } from "@/lib/rmi/store";
import { getDashboardUser } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard() {
  const user = await getDashboardUser();
  return user
    ? null
    : NextResponse.json({ error: "You are not signed in as an admin." }, { status: 403 });
}

/** Load the sample set, replacing any earlier one. Real records are never touched. */
export async function POST() {
  const denied = await guard();
  if (denied) return denied;

  const { assessments, responses } = buildSamples();
  await replaceSamples(assessments, responses);
  return NextResponse.json({ loaded: await countSamples() }, { status: 201 });
}

/** Remove every sample record and nothing else. */
export async function DELETE() {
  const denied = await guard();
  if (denied) return denied;

  return NextResponse.json({ removed: await removeSamples() });
}
