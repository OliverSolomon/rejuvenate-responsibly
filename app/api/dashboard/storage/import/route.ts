import { NextResponse } from "next/server";
import { importLegacy, storageBackend } from "@/lib/rmi/store";
import { getDashboardUser } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Copy the old local file's records into Supabase. Insert-only: existing rows
 * are never overwritten and the file is never changed, so it is safe to press
 * more than once.
 */
export async function POST() {
  const user = await getDashboardUser();
  if (!user) {
    return NextResponse.json({ error: "You are not signed in as an admin." }, { status: 403 });
  }
  if (storageBackend() !== "supabase") {
    return NextResponse.json(
      { error: "Supabase storage is not active on this server, so there is nothing to import into." },
      { status: 409 },
    );
  }

  try {
    return NextResponse.json({ result: await importLegacy() });
  } catch (err) {
    console.error("[rmi:storage] import failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The import failed." },
      { status: 500 },
    );
  }
}
