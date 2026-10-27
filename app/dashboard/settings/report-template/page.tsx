import type { Metadata } from "next";
import Link from "next/link";
import { TemplateEditor, type TemplateState } from "@/components/dashboard/template-editor";
import { assetHref } from "@/lib/rmi/files";
import { renderMarkdown } from "@/lib/rmi/markdown";
import { pageMeta } from "@/lib/seo";
import { brandAssets } from "@/lib/rmi/settings";
import { readTemplate } from "@/lib/rmi/store";
import {
  EDITOR_STARTER_HTML,
  expiryNoticeHtml,
  firmValues,
  imageTag,
  type TemplateValues,
} from "@/lib/rmi/template";
import { getDashboardUser } from "@/utils/supabase/server";
import { connection } from "next/server";

const longDate = (value: Date) =>
  value.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export const metadata: Metadata = pageMeta({
  title: "Report template",
  description: "The letterhead and footer every report is wrapped in.",
  path: "/dashboard/settings/report-template",
  private: true,
});

export const dynamic = "force-dynamic";

/** Enough of a report to judge the letterhead against. */
const SAMPLE_BODY = `# Sustainability assessment

## Where the organisation stands

Governance is the strongest pillar, carried by an active board committee and a
published code of conduct. Environmental disclosure is the weakest: energy use
is tracked internally but never reported, and water has no owner.

| Pillar | Coverage | Depth | Score |
| --- | --- | --- | --- |
| Corporate governance | 78 | 61 | 70 |
| Economic viability | 64 | 52 | 58 |
| Environmental stewardship | 41 | 28 | 35 |
| Social responsibility | 70 | 55 | 63 |

## What to do first

- Publish a scope 1 and 2 inventory covering the last full year.
- Give water use a named owner and a quarterly figure.
- Put the supplier code of conduct in front of the board for approval.

## How stakeholders see it

Stakeholders rate governance close to the organisation's own view and score
environmental practice lower, which usually means the work is real but not
visible outside the building.`;

export default async function ReportTemplatePage() {
  // Read once, after the request has started, rather than reaching for the
  // clock while the page renders.
  await connection();
  const today = new Date();
  const inAYear = new Date(today);
  inAYear.setDate(inAYear.getDate() + 365);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const [template, brand, user] = await Promise.all([
    readTemplate(),
    brandAssets(),
    getDashboardUser(),
  ]);

  const state: TemplateState = {
    version: template.version,
    live: template.published ? "published" : "built-in",
    draftHtml: template.draft?.html ?? null,
    draftAt: template.draft?.at ?? null,
    draftBy: template.draft?.by ?? null,
    publishedHtml: template.published?.html ?? null,
    publishedAt: template.published?.at ?? null,
    publishedBy: template.published?.by ?? null,
    builtIn: EDITOR_STARTER_HTML,
  };

  // Stand-in values, so the preview reads like a real document rather than a
  // page of braces. The expiry notice is left empty, as it is on a current
  // report; a year-old one is previewed from the organisation's own page.
  const sample: TemplateValues = {
    ...firmValues(),
    report: renderMarkdown(SAMPLE_BODY),
    logo: imageTag(brand.logo ? assetHref(brand.logo.path) : undefined, "Logo", "logo"),
    stamp: imageTag(brand.stamp ? assetHref(brand.stamp.path) : undefined, "Stamp", "stamp"),
    client_logo: "",
    organisation: "Mara Logistics Limited",
    reference: "RMI-7F3K2Q",
    tier: "Silver",
    score: "57",
    issued_date: longDate(today),
    expires_date: longDate(inAYear),
    expiry_notice: "",
  };

  return (
    <div>
      <Link
        href="/dashboard/settings"
        className="text-[0.8125rem] text-forest-900/55 underline-offset-4 hover:underline"
      >
        Back to settings
      </Link>
      <h1 className="display mt-4 text-[clamp(1.75rem,3.4vw,2.5rem)]">Report template</h1>
      <p className="mt-3 max-w-[64ch] text-[0.9375rem] leading-relaxed text-forest-900/60">
        The letterhead, footer and standing wording every report is wrapped in. Design it here or
        open a document you already have, mark where the writing goes, and save it as a draft.
        Nothing a client sees changes until you publish.
      </p>
      <p className="mt-2 max-w-[64ch] text-[0.875rem] leading-relaxed text-forest-900/50">
        A PDF cannot be opened for editing. If your letterhead only exists as a PDF, save it as a
        Word document first, or rebuild it here and upload the logo and stamp in settings. The
        editor is a word processor, so it owns the formatting: set type, spacing and borders with
        its own tools rather than expecting a stylesheet from an uploaded web page to survive.
      </p>

      <div className="mt-8">
        <TemplateEditor
          state={state}
          sample={sample}
          editorName={user?.name || user?.email || "Admin"}
        />
      </div>

      {/* Expiry is previewed as it will look, so nobody has to wait a year to see it. */}
      <details className="mt-10 rounded-card border border-forest-900/10 bg-bone-50 p-5">
        <summary className="cursor-pointer text-[0.875rem] font-medium text-forest-900">
          What the expiry notice looks like
        </summary>
        <p className="mt-2 max-w-[60ch] text-[0.8125rem] leading-relaxed text-forest-900/55">
          This replaces {"{{expiry_notice}}"} once a report is more than a year old. Until then the
          placeholder renders as nothing, so it is safe to leave in the template.
        </p>
        <div
          className="mt-4 max-w-[60ch]"
          dangerouslySetInnerHTML={{
            __html: expiryNoticeHtml(yesterday),
          }}
        />
      </details>
    </div>
  );
}
