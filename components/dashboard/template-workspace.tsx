import { connection } from "next/server";
import { TemplateEditor, type TemplateState } from "@/components/dashboard/template-editor";
import { assetHref } from "@/lib/rmi/files";
import { renderMarkdown } from "@/lib/rmi/markdown";
import { currentScope, settingsCompany } from "@/lib/rmi/scope";
import { brandAssets, isShared } from "@/lib/rmi/settings";
import { readTemplate } from "@/lib/rmi/store";
import {
  EDITOR_STARTER_HTML,
  expiryNoticeHtml,
  firmValues,
  imageTag,
  type TemplateValues,
} from "@/lib/rmi/template";
import { getDashboardUser } from "@/utils/supabase/server";

const longDate = (value: Date) =>
  value.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** A full report's worth of writing, so the pages show how a real one fills out. */
const SAMPLE_BODY = `# Sustainability assessment

## Summary

This report sets the organisation's own account of its practice against what the people who deal with it every day said. It covers four pillars: corporate governance, economic viability, environmental stewardship and social responsibility. The overall result is a Silver rating, with clear strengths in governance and a visible gap in environmental disclosure.

Governance is the strongest pillar, carried by an active board committee and a published code of conduct. Environmental disclosure is the weakest: energy use is tracked internally but never reported, and water has no owner.

| Pillar | Coverage | Depth | Score |
| --- | --- | --- | --- |
| Corporate governance | 78 | 61 | 70 |
| Economic viability | 64 | 52 | 58 |
| Environmental stewardship | 41 | 28 | 35 |
| Social responsibility | 70 | 55 | 63 |

## Corporate governance

The board meets quarterly and a standing committee reviews risk and ethics between meetings. A code of conduct is published and signed by every employee on joining. Two gaps remain: there is no whistleblowing channel that sits outside line management, and board minutes are not shared with staff, so decisions are seen only once they take effect.

- Strength: documented decision rights, with a delegation of authority reviewed each year.
- Strength: conflicts of interest are declared and recorded at every board meeting.
- Gap: no independent channel for raising concerns.
- Gap: no public summary of board decisions.

## Economic viability

Revenue has grown for three years running and the business holds six months of operating costs in reserve. Most income comes from two large customers, which stakeholders see as the main exposure. Procurement favours local suppliers where price allows, but this is practice rather than policy, and nothing records how much is spent locally.

- Strength: a financial reserve covering six months of costs.
- Strength: audited accounts filed on time each year.
- Gap: two customers account for most revenue.
- Gap: local spending is not measured.

## Environmental stewardship

Energy use is tracked internally month by month, but the figures are not published and no target has been set. Water has no named owner, so nobody is accountable for a reading or a reduction. Waste is sorted on site, and a recycling contractor collects it, yet the weights collected are not recorded.

- Strength: waste is sorted at source and collected by a licensed contractor.
- Gap: no published energy or emissions figures.
- Gap: water use has no owner and no figure.
- Gap: no environmental targets.

## Social responsibility

Staff turnover is low and every employee has a written contract and a pay review each year. Health and safety training is current for all site staff. Stakeholders praise the organisation's response to complaints but note that apprenticeship and training places are offered informally, which makes them hard for outsiders to find.

- Strength: written contracts and an annual pay review for everyone.
- Strength: complaints are answered within a week.
- Gap: training and apprenticeship places are not advertised.
- Gap: no record of the organisation's local hiring.

## How stakeholders see it

Stakeholders rate governance close to the organisation's own view and score environmental practice lower, which usually means the work is real but not visible outside the building. The widest difference is on environmental stewardship, where the organisation scored itself well above what the people it works with could see.

| Pillar | Own view | Stakeholders | Difference |
| --- | --- | --- | --- |
| Corporate governance | 70 | 66 | -4 |
| Economic viability | 58 | 55 | -3 |
| Environmental stewardship | 35 | 24 | -11 |
| Social responsibility | 63 | 58 | -5 |

## What to do first

1. Publish a scope 1 and 2 emissions inventory covering the last full year.
2. Give water use a named owner and a quarterly figure.
3. Put the supplier code of conduct in front of the board for approval.
4. Set up a whistleblowing channel that does not run through line management.
5. Record local spending and local hiring, and report both once a year.

## Roadmap

In the first three months, name the owners and start recording: water, local spend and waste weights need nothing more than a person and a spreadsheet. In months four to six, publish the first environmental figures and the board's decision summary. By the end of the year, set targets for energy and water, and reassess to measure the change.

## Basis of this report

This report is issued on the basis of self-declared responses and the stakeholder survey. It is not an audit. Scores are out of 100 and combine how much of each pillar the organisation covers with how deep its practice goes. If you would like the findings validated, reply to the email that carried this report and we will arrange a diagnostic call.`;

/**
 * The report template, ready to work on: the editor with the template already
 * in it, and every page of a sample report laid out side by side beneath.
 *
 * Shared by the Settings tab and the standalone address, so the two cannot
 * drift apart. A company that uses the platform's template gets an explanation
 * instead of an editor whose saves would be refused.
 */
export async function TemplateWorkspace() {
  // Read once, after the request has started, rather than reaching for the
  // clock while the page renders.
  await connection();
  const today = new Date();
  const inAYear = new Date(today);
  inAYear.setDate(inAYear.getDate() + 365);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const scope = await currentScope();
  const company = scope ? settingsCompany(scope) : "default";

  if (await isShared(company, "template")) {
    return (
      <div className="max-w-[60ch] rounded-card border border-forest-900/10 bg-bone-50 p-6 sm:p-8">
        <p className="text-[0.9375rem] font-medium text-forest-900">
          Your reports use the shared template
        </p>
        <p className="mt-2 text-[0.875rem] leading-relaxed text-forest-900/60">
          The letterhead and footer come from the platform administrator, so every report carries
          the same layout. Your own logo and stamp, if you have uploaded them in Branding, still go
          on it. If you need a template of your own, ask the administrator to switch sharing off for
          your company.
        </p>
      </div>
    );
  }

  const [template, brand, user] = await Promise.all([
    readTemplate(company),
    brandAssets(company),
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
  // report; a year-old one is previewed below.
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
      <p className="max-w-[64ch] text-[0.875rem] leading-relaxed text-forest-900/55">
        The letterhead, footer and standing wording every report is wrapped in. The template below
        is what your reports use now: edit it, or open a document you already have and mark where
        the writing goes, then save a draft. Nothing a client sees changes until you publish. A PDF
        cannot be opened for editing, so save a letterhead that only exists as a PDF as a Word
        document first.
      </p>

      <div className="mt-6">
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
          dangerouslySetInnerHTML={{ __html: expiryNoticeHtml(yesterday) }}
        />
      </details>
    </div>
  );
}
