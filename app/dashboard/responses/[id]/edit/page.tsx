import { normaliseCode } from "@/lib/rmi/store";
import { ownedAssessment } from "@/lib/rmi/dashboard";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { notFound } from "next/navigation";
import { getDashboardUser } from "@/utils/supabase/server";
import { ReportEditor } from "@/components/dashboard/report-editor";

export const metadata: Metadata = pageMeta({
  title: "Edit report",
  description:
    "Edit the report before it is sent.",
  path: "/dashboard/responses",
  private: true,
});

export const dynamic = "force-dynamic";

/**
 * Full page: the dashboard's top bar stays, with Back leading to the
 * organisation, and the editor takes everything beneath it.
 */
export default async function EditReportPage({
  params,
}: PageProps<"/dashboard/responses/[id]/edit">) {
  const { id } = await params;
  const [assessment, user] = await Promise.all([ownedAssessment(normaliseCode(id)), getDashboardUser()]);
  if (!assessment?.report || !user) notFound();

  return (
    <ReportEditor
      assessmentId={id}
      organisation={assessment.profile.organisation || id}
      markdown={assessment.report.markdown}
      editorName={user.name || user.email}
    />
  );
}
