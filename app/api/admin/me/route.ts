import { NextResponse } from "next/server";
import { getDashboardUser } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Is the person making this request an admin? Used by the public site to show
 * the admin banner. It says yes or no and, for an admin, their own name; it
 * never lists or returns anything about anyone else.
 */
export async function GET() {
  const user = await getDashboardUser();
  return NextResponse.json(
    user ? { admin: true, name: user.name ?? user.email } : { admin: false },
    { headers: { "cache-control": "no-store" } },
  );
}
