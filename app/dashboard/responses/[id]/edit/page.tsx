import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAssessment } from "@/lib/rmi/store";
import { getDashboardUser } from "@/utils/supabase/server";
import { ReportEditor } from "@/components/dashboard/report-editor";

export const metadata: Metadata = {
  title: "Edit report",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditReportPage({
  params,
}: PageProps<"/dashboard/responses/[id]/edit">) {
  const { id } = await params;
  const [assessment, user] = await Promise.all([getAssessment(id), getDashboardUser()]);
  if (!assessment?.report || !user) notFound();

  return (
    <div>
      <Link
        href={`/dashboard/responses/${id}`}
        className="text-[0.8125rem] text-forest-900/55 underline-offset-4 hover:underline"
      >
        Back to {assessment.profile.organisation || id}
      </Link>
      <h1 className="display mt-4 text-[clamp(1.625rem,3.2vw,2.25rem)]">Edit report</h1>
      <div className="mt-6">
        <ReportEditor
          assessmentId={id}
          organisation={assessment.profile.organisation || id}
          markdown={assessment.report.markdown}
          editorName={user.name || user.email}
        />
      </div>
    </div>
  );
}
