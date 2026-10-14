import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAssessment } from "@/lib/rmi/store";
import { getDashboardUser } from "@/utils/supabase/server";
import { ReportEditor } from "@/components/dashboard/report-editor";

export const metadata: Metadata = {
  title: "Edit report",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Full page: the dashboard's top bar stays, with Back leading to the
 * organisation, and the editor takes everything beneath it.
 */
export default async function EditReportPage({
  params,
}: PageProps<"/dashboard/responses/[id]/edit">) {
  const { id } = await params;
  const [assessment, user] = await Promise.all([getAssessment(id), getDashboardUser()]);
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
