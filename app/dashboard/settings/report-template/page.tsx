import type { Metadata } from "next";
import Link from "next/link";
import { TemplateWorkspace } from "@/components/dashboard/template-workspace";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Report template",
  description: "The letterhead and footer every report is wrapped in.",
  path: "/dashboard/settings/report-template",
  private: true,
});

export const dynamic = "force-dynamic";

/**
 * The template on its own address, kept so older links and the set-up notices
 * still land somewhere. The same workspace is what the Settings tab shows.
 */
export default function ReportTemplatePage() {
  return (
    <div>
      <Link
        href="/dashboard/settings#template"
        className="text-[0.8125rem] text-forest-900/55 underline-offset-4 hover:underline"
      >
        Back to settings
      </Link>
      <h1 className="display mt-4 mb-6 text-[clamp(1.75rem,3.4vw,2.5rem)]">Report template</h1>
      <TemplateWorkspace />
    </div>
  );
}
