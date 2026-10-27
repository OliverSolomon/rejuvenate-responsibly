import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportPreview } from "@/components/dashboard/report-preview";
import type { OutstandingParty } from "@/components/dashboard/send-report";
import { composeReport } from "@/lib/rmi/compose";
import { pageMeta } from "@/lib/seo";
import { getAssessment, isUndelivered, normaliseCode } from "@/lib/rmi/store";
import { getDashboardUser } from "@/utils/supabase/server";

export const metadata: Metadata = pageMeta({
  title: "Report preview",
  description: "The report as the client will receive it.",
  path: "/dashboard/responses",
  private: true,
});

export const dynamic = "force-dynamic";

export default async function ReportPreviewPage({
  params,
}: PageProps<"/dashboard/responses/[id]/preview">) {
  const { id } = await params;
  const [assessment, user] = await Promise.all([
    getAssessment(normaliseCode(id)),
    getDashboardUser(),
  ]);
  if (!assessment || !user) notFound();

  const composed = await composeReport(assessment);
  if (!composed) {
    return (
      <div>
        <Link
          href={`/dashboard/responses/${assessment.id}`}
          className="text-[0.8125rem] text-forest-900/55 underline-offset-4 hover:underline"
        >
          Back to {assessment.profile.organisation || assessment.id}
        </Link>
        <h1 className="display mt-4 text-[clamp(1.625rem,3.2vw,2.25rem)]">Nothing to preview</h1>
        <p className="mt-3 max-w-[56ch] text-[0.9375rem] leading-relaxed text-forest-900/60">
          No report has been written for this organisation yet. Write one from its own page first.
        </p>
      </div>
    );
  }

  const outstanding: OutstandingParty[] = assessment.shares
    .filter((s) => !s.respondedAt)
    .map((s) => ({
      name: s.name,
      email: s.email,
      relationship: s.relationship,
      undelivered: isUndelivered(s),
    }));

  return (
    <div>
      <Link
        href={`/dashboard/responses/${assessment.id}`}
        className="text-[0.8125rem] text-forest-900/55 underline-offset-4 hover:underline"
      >
        Back to {assessment.profile.organisation || assessment.id}
      </Link>
      <h1 className="display mt-4 text-[clamp(1.625rem,3.2vw,2.25rem)]">
        {assessment.profile.organisation || assessment.id}
      </h1>
      <p className="mt-2 text-[0.875rem] text-forest-900/55">
        Reference {assessment.id}
        {composed.expired ? " · this report has passed its year and is marked expired" : ""}
      </p>

      <div className="mt-8">
        <ReportPreview
          assessmentId={assessment.id}
          submitterEmail={assessment.profile.email}
          documentHtml={composed.html}
          filename={composed.filename}
          templateVersion={composed.templateVersion}
          usingBuiltInTemplate={composed.templateVersion === 0}
          outstanding={outstanding}
          sentAt={assessment.report?.sentAt ?? null}
          editorName={user.name || user.email}
        />
      </div>
    </div>
  );
}
