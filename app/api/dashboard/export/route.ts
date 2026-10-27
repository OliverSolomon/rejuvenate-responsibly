import { NextResponse } from "next/server";
import { samplesHidden } from "@/lib/rmi/settings";
import { listAllStakeholderResponses, listAssessments } from "@/lib/rmi/store";
import { buildWorkbook, workbookFilename } from "@/lib/rmi/workbook";
import { getDashboardUser } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** A few thousand rows of spreadsheet takes a moment to assemble. */
export const maxDuration = 120;

/**
 * Everything people have entered, as a spreadsheet.
 *
 * Open to anyone on the dashboard rather than owners only: reading what clients
 * submitted is the job, and this is the same data the responses pages already
 * show, in a shape that can be analysed.
 *
 * It follows the sample switch, so an export made while samples are hidden
 * holds only real work. The first sheet says which of the two it is, because a
 * spreadsheet outlives the memory of the setting it was made under.
 */
export async function GET() {
  const user = await getDashboardUser();
  if (!user) {
    return NextResponse.json({ error: "You are not signed in as an admin." }, { status: 403 });
  }

  try {
    const [assessments, responses, hidden] = await Promise.all([
      listAssessments(),
      listAllStakeholderResponses(),
      samplesHidden(),
    ]);

    const visible = hidden ? assessments.filter((a) => !a.sample) : assessments;
    const keep = new Set(visible.map((a) => a.id));
    const theirResponses = hidden
      ? responses.filter((r) => keep.has(r.assessmentId))
      : responses;

    const bytes = await buildWorkbook({
      assessments: visible,
      responses: theirResponses,
      exportedBy: user.name ? `${user.name} (${user.email})` : user.email,
      samplesIncluded: !hidden,
    });

    const filename = workbookFilename();
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[rmi:export] the workbook could not be built", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `The spreadsheet could not be built: ${error.message}`
            : "The spreadsheet could not be built.",
      },
      { status: 500 },
    );
  }
}
